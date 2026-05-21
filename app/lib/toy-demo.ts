export type Point = {
  x: number;
  y: number;
};

export type ToyConfig = {
  id?: string;
  name?: string;
  description?: string;
  image?: string;
  points?: Point[];
};

export type DemoToy = {
  id: string;
  name: string;
  description: string;
  image: string;
  points: Point[];
};

export type ImageSize = {
  width: number;
  height: number;
};

export const TOY_CONFIG_URL = "/toy-configs.json";

const MIN_DEMO_POINTS = 4;
const PREFERRED_IMAGES = new Set(["image14.png", "image15.png", "image14", "image15"]);

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeToy(toy: ToyConfig): DemoToy | null {
  const image = toy.image?.replace(/^\/?pics\//, "");

  if (!image) {
    return null;
  }

  return {
    id: toy.id ?? image.replace(/\.[^.]+$/, ""),
    name: toy.name || image.replace(/\.[^.]+$/, ""),
    description: toy.description ?? "",
    image,
    points: Array.isArray(toy.points)
      ? toy.points.map((point) => ({
          x: clamp(Number(point.x)),
          y: clamp(Number(point.y)),
        }))
      : [],
  };
}

export function chooseDemoToy(toys: DemoToy[]) {
  const usableToys = toys.filter((toy) => toy.points.length >= MIN_DEMO_POINTS);

  return (
    usableToys.find((toy) => PREFERRED_IMAGES.has(toy.image) || PREFERRED_IMAGES.has(toy.id)) ??
    usableToys[0] ??
    null
  );
}

export function getContainedImageSize(size: ImageSize | null) {
  if (!size || size.width <= 0 || size.height <= 0) {
    return { width: 2, height: 2 };
  }

  const aspect = size.width / size.height;

  if (aspect >= 1) {
    return { width: 2, height: 2 / aspect };
  }

  return { width: 2 * aspect, height: 2 };
}

export function getScenePoint(point: Point, imagePlane: ImageSize) {
  return [(point.x - 0.5) * imagePlane.width, (0.5 - point.y) * imagePlane.height, 0.05] as [
    number,
    number,
    number,
  ];
}
