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
      return b.potencia - a.potencia; // prefer higher potencia
    }
    return diff;
  });

  return sorted[0];
}
