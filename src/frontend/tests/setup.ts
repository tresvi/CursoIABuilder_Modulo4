import "@testing-library/jest-dom/vitest";

// jsdom no implementa el canvas 2D. Los componentes de render manejan un contexto
// nulo (early return); devolvemos null aquí para evitar el ruido "Not implemented".
if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = () => null as never;
}
