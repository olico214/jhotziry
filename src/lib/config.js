export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "jhotziry";

export const APP_TAGLINE = "Crea, imagina e imprime";

export const APP_DESCRIPTION =
  "Convierte una idea o una foto en un modelo 3D listo para imprimir. Sin complicaciones.";

export const CREDITS_PER_IMAGE = Number(
  process.env.NEXT_PUBLIC_CREDITS_PER_PREVIEW || 5,
);

export const CREDITS_PER_IDEA = Number(
  process.env.NEXT_PUBLIC_CREDITS_PER_IDEA || 1,
);

export const TRIPO_COST_MODEL = Number(
  process.env.NEXT_PUBLIC_TRIPO_COST_MODEL || 30,
);

export const TRIPO_COST_PARTS = Number(
  process.env.NEXT_PUBLIC_TRIPO_COST_PARTS || 40,
);
