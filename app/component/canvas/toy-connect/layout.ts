import type { Toy } from "~/lib/toy-connect";
import type { FieldVariant, ScenePoint, ToyLayoutItem, ViewportBounds } from "./types";

export const FIELD_CAMERA_ZOOM = 100;
export const PLAY_FRAME_SIZE = 2.7;
export const SHOWCASE_TOY_SCALE = 0.28;
export const SELECT_TOY_SCALE = 0.5;

const SHOWCASE_SAFE_TOP_RATIO = 0.22;
const SHOWCASE_SAFE_BOTTOM_RATIO = 0.12;
const SHOWCASE_SAFE_X_RATIO = 0.12;
const SELECT_SAFE_TOP_RATIO = 0.12;
const SELECT_SAFE_BOTTOM_RATIO = 0.12;
const SELECT_COLUMN_GAP_RATIO = 0.32;
const SELECT_ROW_GAP = PLAY_FRAME_SIZE * SELECT_TOY_SCALE * 1.18;

function getSeedValue(seed: string) {
  return Array.from(seed).reduce((value, char) => {
    return (value * 33 + char.charCodeAt(0)) % 1000003;
  }, 23);
}

function getSeedUnit(seed: string, offset: number) {
  const value = Math.sin(getSeedValue(`${seed}-${offset}`) * 12.9898) * 43758.5453;

  return value - Math.floor(value);
}

export function getFieldViewport(size: ViewportBounds) {
  return {
    width: size.width / FIELD_CAMERA_ZOOM,
    height: size.height / FIELD_CAMERA_ZOOM,
  };
}

export function getShowcasePosition(toy: Toy, index: number, viewport: ViewportBounds): ScenePoint {
  const toySize = PLAY_FRAME_SIZE * SHOWCASE_TOY_SCALE;
  const minX = viewport.width * -0.5 + viewport.width * SHOWCASE_SAFE_X_RATIO + toySize * 0.5;
  const maxX = viewport.width * 0.5 - viewport.width * SHOWCASE_SAFE_X_RATIO - toySize * 0.5;
  const minY = viewport.height * -0.5 + viewport.height * SHOWCASE_SAFE_BOTTOM_RATIO + toySize * 0.5;
  const maxY = viewport.height * 0.5 - viewport.height * SHOWCASE_SAFE_TOP_RATIO - toySize * 0.5;
  const x = minX + getSeedUnit(toy.id || toy.image, 1) * Math.max(0.01, maxX - minX);
  const y = minY + getSeedUnit(toy.id || toy.image, 2) * Math.max(0.01, maxY - minY);
  const z = (index % 7) * 0.01;

  return [x, y, z];
}

export function getSelectPosition(index: number, scrollY: number, viewport: ViewportBounds): ScenePoint {
  const column = index % 2;
  const row = Math.floor(index / 2);
  const columnGap = Math.min(PLAY_FRAME_SIZE * SELECT_TOY_SCALE * 1.35, viewport.width * SELECT_COLUMN_GAP_RATIO);
  const x = column === 0 ? columnGap * -0.5 : columnGap * 0.5;
  const topY = viewport.height * 0.5 - viewport.height * SELECT_SAFE_TOP_RATIO - PLAY_FRAME_SIZE * SELECT_TOY_SCALE * 0.5;
  const y = topY - row * SELECT_ROW_GAP + scrollY;

  return [x, y, 0];
}

export function getToyLayoutItems(
  toys: Toy[],
  mode: FieldVariant,
  scrollY: number,
  viewport: ViewportBounds,
): ToyLayoutItem[] {
  return toys.map((toy, index) => ({
    toy,
    index,
    position: mode === "showcase" ? getShowcasePosition(toy, index, viewport) : getSelectPosition(index, scrollY, viewport),
    scale: PLAY_FRAME_SIZE * (mode === "showcase" ? SHOWCASE_TOY_SCALE : SELECT_TOY_SCALE),
  }));
}

export function getSelectScrollMax(toyCount: number, viewport: ViewportBounds) {
  const rowCount = Math.ceil(toyCount / 2);
  const contentHeight = rowCount > 0 ? PLAY_FRAME_SIZE * SELECT_TOY_SCALE + (rowCount - 1) * SELECT_ROW_GAP : 0;
  const visibleHeight = viewport.height * (1 - SELECT_SAFE_TOP_RATIO - SELECT_SAFE_BOTTOM_RATIO);

  return Math.max(0, contentHeight - visibleHeight);
}

export function clampSelectScroll(value: number, toyCount: number, viewport: ViewportBounds) {
  return Math.min(getSelectScrollMax(toyCount, viewport), Math.max(0, value));
}

export function getPlayZoom(size: ViewportBounds) {
  const widthZoom = size.width / (PLAY_FRAME_SIZE * 1.08);
  const heightZoom = size.height / (PLAY_FRAME_SIZE * 1.72);

  return Math.max(120, Math.min(widthZoom, heightZoom));
}
