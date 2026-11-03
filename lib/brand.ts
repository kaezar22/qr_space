/**
 * Datos de la marca que no cambian con frecuencia.
 * El nombre visible sale de NEXT_PUBLIC_BAR_NAME; lo demás se edita aquí.
 */
export const BRAND = {
  tagline: "Pide desde tu mesa · te avisamos cuando esté listo",
  address: "Calle 45 # 19-30 · Segundo piso · Bogotá",
  /** Nota corta debajo del título de una categoría. */
  categoryNotes: {
    Comida: "Cocina hasta 11:30 p. m.",
    "Cerveza de la casa": "Decibel · artesanal",
    Licores: "Trago · media · botella",
  } as Record<string, string>,
};
