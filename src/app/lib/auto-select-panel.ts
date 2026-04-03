export interface CatalogoPanelConPrecio {
  id: string;
  marca: string;
  modelo: string;
  potencia: number;
  precioWatt: number;
  precio: number;
  flete?: number;
  precioCable?: number;
}

/**
 * Auto-selects the best-priced panel from the catalog.
 * Picks the lowest precioWatt; ties (within 0.001) broken by higher potencia.
 */
export function autoSelectPanel(
  catalogoPaneles: CatalogoPanelConPrecio[],
): CatalogoPanelConPrecio | null {
  if (catalogoPaneles.length === 0) return null;

  const sorted = [...catalogoPaneles].sort((a, b) => {
    const diff = a.precioWatt - b.precioWatt;
    if (Math.abs(diff) <= 0.001) {
      return b.potencia - a.potencia;
    }
    return diff;
  });

  return sorted[0];
}

/**
 * Auto-selects a mid-range panel (median by precioWatt).
 * Avoids the cheapest and most expensive, picks a balanced default.
 */
export function autoSelectPanelDefault(
  catalogoPaneles: CatalogoPanelConPrecio[],
): CatalogoPanelConPrecio | null {
  if (catalogoPaneles.length === 0) return null;
  if (catalogoPaneles.length <= 2) return autoSelectPanel(catalogoPaneles);

  const sorted = [...catalogoPaneles].sort((a, b) => {
    const diff = a.precioWatt - b.precioWatt;
    if (Math.abs(diff) <= 0.001) return b.potencia - a.potencia;
    return diff;
  });

  // Pick median (slightly below center for even counts)
  const midIdx = Math.floor((sorted.length - 1) / 2);
  return sorted[midIdx];
}

// ── Panel Recommendations ──────────────────────────────────────────────

export interface OfertaSimple {
  productoId: string;
  precio: number; // USD/W
  precioTiers?: { etiqueta: string; precio: number }[];
}

export interface PanelRecommendation {
  id: string;
  marca: string;
  modelo: string;
  potencia: number;
  precioWatt: number;
  /** Extra info for display (e.g. pallet size) */
  detail?: string;
}

export interface PanelRecommendations {
  /** Best unit price ($/W) — only unit-level offers, no pallet-only */
  mejorUnitario: PanelRecommendation | null;
  /** Best pallet price ($/W) — from precioTiers with pallet info */
  mejorPallet: (PanelRecommendation & { palletQty: number; palletPrecioWatt: number }) | null;
  /** Best cost-benefit — considers fewer panels = fewer micros + structure */
  mejorCostoBeneficio: PanelRecommendation | null;
}

/** Extract pallet quantity from tier etiqueta like "1 pallet (36 pzas)" */
function parsePalletQty(etiqueta: string): number | null {
  // Match patterns like "(36 pzas)", "(31 pcs)", "(36)", etc.
  const m = etiqueta.match(/\((\d+)\s*(?:pzas?|pcs?|paneles?)?\)/i);
  if (m) return parseInt(m[1], 10);
  // Match "36 pzas" without parens
  const m2 = etiqueta.match(/(\d+)\s*(?:pzas?|pcs?|paneles?)/i);
  if (m2) return parseInt(m2[1], 10);
  return null;
}

/**
 * Analyze catalog and offers to produce 3 smart recommendations.
 *
 * @param panels     CatalogoPanel array (with precioPorWatt = best unit offer)
 * @param ofertas    All offers (to access precioTiers for pallet pricing)
 * @param microPrice USD price per microinverter (for cost-benefit calc)
 * @param panelesPorMicro panels per microinverter
 */
export function analyzePanelRecommendations(
  panels: CatalogoPanelConPrecio[],
  ofertas: OfertaSimple[],
  microPrice: number,
  panelesPorMicro: number,
): PanelRecommendations {
  if (panels.length === 0) {
    return { mejorUnitario: null, mejorPallet: null, mejorCostoBeneficio: null };
  }

  // ── 1. Best unit price ──
  // The panel's precioWatt is already from mejorOferta (lowest offer.precio = unit price)
  const sortedByUnit = [...panels].sort((a, b) => {
    const diff = a.precioWatt - b.precioWatt;
    if (Math.abs(diff) <= 0.001) return b.potencia - a.potencia;
    return diff;
  });
  const mejorUnitario: PanelRecommendation = {
    id: sortedByUnit[0].id,
    marca: sortedByUnit[0].marca,
    modelo: sortedByUnit[0].modelo,
    potencia: sortedByUnit[0].potencia,
    precioWatt: sortedByUnit[0].precioWatt,
    detail: `$${sortedByUnit[0].precioWatt.toFixed(3)}/W`,
  };

  // ── 2. Best pallet price ──
  let mejorPallet: PanelRecommendations["mejorPallet"] = null;
  for (const panel of panels) {
    // Strip "v2_" prefix to match with ofertas productoId
    const rawId = panel.id.startsWith("v2_") ? panel.id.slice(3) : panel.id;
    const panelOfertas = ofertas.filter((o) => o.productoId === rawId);

    for (const oferta of panelOfertas) {
      if (!oferta.precioTiers) continue;
      for (const tier of oferta.precioTiers) {
        if (!/pallet/i.test(tier.etiqueta)) continue;
        // Only consider single-pallet tiers (not "+5 pallets")
        if (/^\+?\d+\s*pallet/i.test(tier.etiqueta) && tier.etiqueta.startsWith("+")) continue;
        const qty = parsePalletQty(tier.etiqueta);
        if (!qty) continue;

        if (!mejorPallet || tier.precio < mejorPallet.palletPrecioWatt) {
          mejorPallet = {
            id: panel.id,
            marca: panel.marca,
            modelo: panel.modelo,
            potencia: panel.potencia,
            precioWatt: panel.precioWatt,
            palletQty: qty,
            palletPrecioWatt: tier.precio,
            detail: `$${tier.precio.toFixed(3)}/W · ${qty} paneles`,
          };
        }
      }
    }
  }

  // ── 3. Best cost-benefit (overall system cost) ──
  // For a reference system of 3kWp, estimate total cost including:
  //   - Panel cost: precioWatt * potencia * numPaneles
  //   - Micro cost: ceil(numPaneles / panelesPorMicro) * microPrice
  //   - Overhead per panel (structure, hardware, labor): ~$15 USD rough estimate
  const REF_KWP = 3;
  const OVERHEAD_PER_PANEL_USD = 15;

  let bestSystemCost = Infinity;
  let mejorCostoBeneficio: PanelRecommendation | null = null;

  for (const panel of panels) {
    const numPaneles = Math.ceil((REF_KWP * 1000) / panel.potencia);
    const panelCost = numPaneles * panel.potencia * panel.precioWatt;
    const microCost = Math.ceil(numPaneles / panelesPorMicro) * microPrice;
    const overheadCost = numPaneles * OVERHEAD_PER_PANEL_USD;
    const totalCost = panelCost + microCost + overheadCost;

    if (totalCost < bestSystemCost) {
      bestSystemCost = totalCost;
      mejorCostoBeneficio = {
        id: panel.id,
        marca: panel.marca,
        modelo: panel.modelo,
        potencia: panel.potencia,
        precioWatt: panel.precioWatt,
        detail: `${numPaneles} paneles · ~$${Math.round(totalCost)} USD`,
      };
    }
  }

  return { mejorUnitario, mejorPallet, mejorCostoBeneficio };
}
