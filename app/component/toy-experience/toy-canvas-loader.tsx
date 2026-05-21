import { lazy } from "react";

export function loadToyCanvasModule() {
  return import("~/component/canvas/ToyConnectCanvas");
}

export const LazyToyConnectCanvas = lazy(() =>
  loadToyCanvasModule().then((module) => ({
    default: module.ToyConnectCanvas,
  })),
);
