/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as archivos from "../archivos.js";
import type * as consolidador from "../consolidador.js";
import type * as cotizaciones from "../cotizaciones.js";
import type * as importRowStaging from "../importRowStaging.js";
import type * as importRuns from "../importRuns.js";
import type * as ofertas from "../ofertas.js";
import type * as ordenesCompra from "../ordenesCompra.js";
import type * as priceLists from "../priceLists.js";
import type * as productos from "../productos.js";
import type * as proveedores from "../proveedores.js";
import type * as seguimientoItems from "../seguimientoItems.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  archivos: typeof archivos;
  consolidador: typeof consolidador;
  cotizaciones: typeof cotizaciones;
  importRowStaging: typeof importRowStaging;
  importRuns: typeof importRuns;
  ofertas: typeof ofertas;
  ordenesCompra: typeof ordenesCompra;
  priceLists: typeof priceLists;
  productos: typeof productos;
  proveedores: typeof proveedores;
  seguimientoItems: typeof seguimientoItems;
  validators: typeof validators;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
