import type { Toy } from "~/lib/toy-connect";
import type { FieldVariant, ScenePoint, ToyLayoutItem, ViewportBounds } from "./types";

export const FIELD_CAMERA_ZOOM = 100;
export const PLAY_FRAME_SIZE = 2.7;
export const SELECT_TOY_SCALE = 1;
const PHONE_PLAY_VIEWPORT_MAX_WIDTH = 720;
const PHONE_PLAY_FRAME_VIEWPORT_RATIO = 1.05;
const PLAY_CAMERA_CONTENT_LIFT_PX = 38;
const SELECT_COLUMN_COUNT = 2;
const SELECT_FRAME_VIEWPORT_RATIO = 1.05;
const SELECT_CAMERA_PULLBACK_RATIO = 0.9;
const SELECT_MIN_ZOOM = 48;

const SHOWCASE_SAFE_TOP_RATIO = 0.08;
const SHOWCASE_SAFE_BOTTOM_RATIO = 0.08;
const SHOWCASE_SAFE_X_RATIO = 0.08;
const SHOWCASE_MAX_TOY_SCALE = 0.44;
const SHOWCASE_MIN_TOY_SCALE = 0.2;
const SHOWCASE_CELL_FILL_RATIO = 0.78;
const SELECT_SAFE_TOP_RATIO = 0.08;
const SELECT_SAFE_BOTTOM_RATIO = 0.12;
const SELECT_ROW_GAP = PLAY_FRAME_SIZE * 1.58;

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

export function getViewportForZoom(size: ViewportBounds, zoom: number) {
  return {
    width: size.width / zoom,
    height: size.height / zoom,
  };
}

function getShowcaseGrid(toyCount: number, viewport: ViewportBounds) {
  const safeWidth = Math.max(0.1, viewport.width * (1 - SHOWCASE_SAFE_X_RATIO * 2));
  const safeHeight = Math.max(0.1, viewport.height * (1 - SHOWCASE_SAFE_TOP_RATIO - SHOWCASE_SAFE_BOTTOM_RATIO));
  const columns = Math.max(1, Math.ceil(Math.sqrt((toyCount * safeWidth) / safeHeight)));
  const rows = Math.max(1, Math.ceil(toyCount / columns));
  const cellWidth = safeWidth / columns;
  const cellHeight = safeHeight / rows;
  const scale = Math.min(
    SHOWCASE_MAX_TOY_SCALE,
    Math.max(SHOWCASE_MIN_TOY_SCALE, (Math.min(cellWidth, cellHeight) * SHOWCASE_CELL_FILL_RATIO) / PLAY_FRAME_SIZE),
  );

  return {
    cellHeight,
    cellWidth,
    columns,
    scale,
    topY: viewport.height * 0.5 - viewport.height * SHOWCASE_SAFE_TOP_RATIO,
  };
}

export function getShowcasePosition(
  toy: Toy,
  index: number,
  toyCount: number,
  viewport: ViewportBounds,
): ScenePoint {
  const grid = getShowcaseGrid(toyCount, viewport);
  const row = Math.floor(index / grid.columns);
  const column = index % grid.columns;
  const remainingInRow = toyCount - row * grid.columns;
  const columnsInRow = Math.max(1, Math.min(grid.columns, remainingInRow));
  const rowWidth = grid.cellWidth * columnsInRow;
  const maxJitterX = Math.max(0, (grid.cellWidth - PLAY_FRAME_SIZE * grid.scale) * 0.28);
  const maxJitterY = Math.max(0, (grid.cellHeight - PLAY_FRAME_SIZE * grid.scale) * 0.22);
  const x =
    rowWidth * -0.5 +
    grid.cellWidth * (column + 0.5) +
    (getSeedUnit(toy.id || toy.image, 1) - 0.5) * maxJitterX;
  const y =
    grid.topY -
    grid.cellHeight * (row + 0.5) +
    (getSeedUnit(toy.id || toy.image, 2) - 0.5) * maxJitterY;
  const z = (index % 7) * 0.01;

  return [x, y, z];
}

export function getShowcaseScale(toyCount: number, viewport: ViewportBounds) {
  return getShowcaseGrid(toyCount, viewport).scale;
}

export function getSelectPosition(index: number, scrollY: number, viewport: ViewportBounds): ScenePoint {
  const column = index % 2;
  const row = Math.floor(index / 2);
  const x = (column - 0.5) * PLAY_FRAME_SIZE;
  const topY = viewport.height * 0.5 - viewport.height * SELECT_SAFE_TOP_RATIO - PLAY_FRAME_SIZE * 0.5;
  const y = topY - row * SELECT_ROW_GAP + scrollY;

  return [x, y, 0];
}

export function getToyLayoutItems(
  toys: Toy[],
  mode: FieldVariant,
  scrollY: number,
  viewport: ViewportBounds,
): ToyLayoutItem[] {
  const showcaseScale = getShowcaseScale(toys.length, viewport);

  return toys.map((toy, index) => ({
    toy,
    index,
    position:
      mode === "showcase"
        ? getShowcasePosition(toy, index, toys.length, viewport)
        : getSelectPosition(index, scrollY, viewport),
    scale: PLAY_FRAME_SIZE * (mode === "showcase" ? showcaseScale : SELECT_TOY_SCALE),
  }));
}

export function getSelectScrollMax(toyCount: number, viewport: ViewportBounds) {
  const rowCount = Math.ceil(toyCount / 2);
  const contentHeight = rowCount > 0 ? PLAY_FRAME_SIZE + (rowCount - 1) * SELECT_ROW_GAP : 0;
  const visibleHeight = viewport.height * (1 - SELECT_SAFE_TOP_RATIO - SELECT_SAFE_BOTTOM_RATIO);

  return Math.max(0, contentHeight - visibleHeight);
}

export function clampSelectScroll(value: number, toyCount: number, viewport: ViewportBounds) {
  return Math.min(getSelectScrollMax(toyCount, viewport), Math.max(0, value));
}

export function getPlayZoom(size: ViewportBounds) {
  const phoneSized = size.width <= PHONE_PLAY_VIEWPORT_MAX_WIDTH;
  const widthRatio = phoneSized ? PHONE_PLAY_FRAME_VIEWPORT_RATIO : 1.08;
  const widthZoom = size.width / (PLAY_FRAME_SIZE * widthRatio);
  const heightZoom = size.height / (PLAY_FRAME_SIZE * 1.72);
  const fittedZoom = Math.min(widthZoom, heightZoom);

  return Math.max(108, phoneSized ? fittedZoom : fittedZoom * 0.9);
}

export function getPlayCameraYOffset(size: ViewportBounds, zoom: number) {
  return -PLAY_CAMERA_CONTENT_LIFT_PX / zoom;
}

export function getSelectZoom(size: ViewportBounds) {
  return Math.max(
    SELECT_MIN_ZOOM,
    (size.width / (PLAY_FRAME_SIZE * SELECT_COLUMN_COUNT * SELECT_FRAME_VIEWPORT_RATIO)) *
      SELECT_CAMERA_PULLBACK_RATIO,
  );
}
