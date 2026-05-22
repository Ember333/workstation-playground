import type { Toy } from "~/lib/toy-connect";
import type { FieldVariant, ScenePoint, ToyLayoutItem, ViewportBounds } from "./types";

export const FIELD_CAMERA_ZOOM = 100;
export const PLAY_FRAME_SIZE = 2.7;
export const SELECT_TOY_SCALE = 1;
const PHONE_PLAY_VIEWPORT_MAX_WIDTH = 720;
const PHONE_PLAY_FRAME_VIEWPORT_RATIO = 1.05;
const PLAY_CAMERA_CONTENT_DROP_PX = -38;
const SELECT_COLUMN_COUNT = 2;
const SELECT_FRAME_VIEWPORT_RATIO = 1.05;
const SELECT_CAMERA_PULLBACK_RATIO = 0.9;
const SELECT_MIN_ZOOM = 48;

const SHOWCASE_SAFE_TOP_RATIO = 0.18;
const SHOWCASE_SAFE_BOTTOM_RATIO = 0.1;
const SHOWCASE_SAFE_X_RATIO = 0.1;
export const SHOWCASE_RING_RADIUS_RATIO = 0.42;
const SHOWCASE_MAX_TOY_SCALE = 0.4;
const SHOWCASE_MIN_TOY_SCALE = 0.27;
const SHOWCASE_RING_FILL_RATIO = 0.54;
const SELECT_SAFE_TOP_RATIO = 0.15;
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

function getShowcaseRing(toyCount: number, viewport: ViewportBounds) {
  const safeWidth = Math.max(0.1, viewport.width * (1 - SHOWCASE_SAFE_X_RATIO * 2));
  const safeHeight = Math.max(0.1, viewport.height * (1 - SHOWCASE_SAFE_TOP_RATIO - SHOWCASE_SAFE_BOTTOM_RATIO));
  const radius = Math.min(safeWidth, safeHeight) * SHOWCASE_RING_RADIUS_RATIO;
  const circumference = Math.PI * 2 * radius;
  const arcSpacing = circumference / Math.max(1, toyCount);
  const scale = Math.min(
    SHOWCASE_MAX_TOY_SCALE,
    Math.max(SHOWCASE_MIN_TOY_SCALE, (arcSpacing * SHOWCASE_RING_FILL_RATIO) / PLAY_FRAME_SIZE),
  );

  return {
    radius,
    scale,
  };
}

export function getShowcasePosition(
  toy: Toy,
  index: number,
  toyCount: number,
  viewport: ViewportBounds,
): ScenePoint {
  const ring = getShowcaseRing(toyCount, viewport);
  const angle = -Math.PI / 2 + (index / Math.max(1, toyCount)) * Math.PI * 2;
  const radialJitter = (getSeedUnit(toy.id || toy.image, 1) - 0.5) * 0.12;
  const tangentJitter = (getSeedUnit(toy.id || toy.image, 2) - 0.5) * 0.04;
  const x = Math.cos(angle + tangentJitter) * (ring.radius + radialJitter);
  const y = Math.sin(angle + tangentJitter) * (ring.radius + radialJitter);
  const z = (index % 7) * 0.01;

  return [x, y, z];
}

export function getShowcaseScale(toyCount: number, viewport: ViewportBounds) {
  return getShowcaseRing(toyCount, viewport).scale;
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
  return PLAY_CAMERA_CONTENT_DROP_PX / zoom;
}

export function getSelectZoom(size: ViewportBounds) {
  return Math.max(
    SELECT_MIN_ZOOM,
    (size.width / (PLAY_FRAME_SIZE * SELECT_COLUMN_COUNT * SELECT_FRAME_VIEWPORT_RATIO)) *
      SELECT_CAMERA_PULLBACK_RATIO,
  );
}
