"use client";

import { useReducer, useCallback } from "react";
import type { LineItem } from "./types";
import {
  cotizacionReducer,
  INITIAL_STATE,
  stateToFormData,
  type CotizacionState,
  type CotizacionAction,
  type Minisplit,
} from "./cotizacion-state";
import type { CotizacionData } from "./types";

type LineItemList = "aluminio" | "tornilleria" | "generales";

export function useCotizacion() {
  const [state, dispatch] = useReducer(cotizacionReducer, INITIAL_STATE);

  /** Set a single field */
  const set = useCallback(
    <K extends keyof CotizacionState>(field: K, value: CotizacionState[K]) => {
      dispatch({ type: "SET_FIELD", field, value: value as CotizacionState[keyof CotizacionState] });
    },
    [],
  );

  /** Batch-set multiple fields */
  const setMany = useCallback(
    (fields: Partial<CotizacionState>) => {
      dispatch({ type: "SET_FIELDS", fields });
    },
    [],
  );

  /** Load a saved cotización into state */
  const loadCotizacion = useCallback(
    (data: CotizacionData) => {
      dispatch({ type: "LOAD_COTIZACION", data });
    },
    [],
  );

  /** Update a single cell in a line-item table */
  const updateLineItem = useCallback(
    (list: LineItemList, index: number, field: keyof LineItem, value: string) => {
      dispatch({ type: "UPDATE_LINE_ITEM", list, index, field, value });
    },
    [],
  );

  /**
   * Set the client name. Auto-syncs `nombreCotizacion` to the same value while
   * the user has not manually diverged it.
   */
  const setClienteNombre = useCallback((value: string) => {
    dispatch({ type: "SET_CLIENTE_NOMBRE", value });
  }, []);

  /**
   * Set the cotización name from user input. Marks the dirty flag so future
   * client-name changes do not overwrite this value — unless the user clears
   * it or makes it equal to the client name, which re-syncs them.
   */
  const setNombreCotizacion = useCallback((value: string) => {
    dispatch({ type: "SET_NOMBRE_COTIZACION", value });
  }, []);

  /** Minisplit helpers */
  const addMinisplit = useCallback(() => dispatch({ type: "ADD_MINISPLIT" }), []);
  const removeMinisplit = useCallback((id: string) => dispatch({ type: "REMOVE_MINISPLIT", id }), []);
  const updateMinisplit = useCallback(
    (id: string, field: keyof Minisplit, value: string | number) => {
      dispatch({ type: "UPDATE_MINISPLIT", id, field, value });
    },
    [],
  );

  /** Get serializable form data for saving */
  const getFormData = useCallback((): CotizacionData => stateToFormData(state), [state]);

  /** Reset to initial state */
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  return {
    state,
    dispatch,
    set,
    setMany,
    setClienteNombre,
    setNombreCotizacion,
    loadCotizacion,
    updateLineItem,
    addMinisplit,
    removeMinisplit,
    updateMinisplit,
    getFormData,
    reset,
  };
}
