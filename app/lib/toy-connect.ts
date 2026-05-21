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

export type Toy = {
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

export const TOY_CONFIG_FILE_NAME = "toy-configs2.json";
export const TOY_CONFIG_URL = `/${TOY_CONFIG_FILE_NAME}`;
export const TOY_IMAGE_BASE_PATH = "/tinified";

const MIN_TOY_POINTS = 4;
const PREFERRED_IMAGES = ["image1.png", "image1", "image8.png", "image8"];

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeToy(toy: ToyConfig): Toy | null {
  const image = toy.image ? normalizeToyImageName(toy.image) : "";

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

export function normalizeToyImageName(image: string) {
  return image.replace(/^\/?(?:pics|tinified)\//, "");
}

export function getToyImageSrc(image: string) {
  return `${TOY_IMAGE_BASE_PATH}/${normalizeToyImageName(image)}`;
}

export function chooseToy(toys: Toy[]) {
  const usableToys = toys.filter((toy) => toy.points.length >= MIN_TOY_POINTS);
  const preferredToy = PREFERRED_IMAGES.map((preferredImage) =>
    usableToys.find((toy) => toy.image === preferredImage || toy.id === preferredImage),
  ).find((toy): toy is Toy => Boolean(toy));

  return preferredToy ?? usableToys[0] ?? null;
}

export function getContainedImageSize(size: ImageSize | null, maxExtent = 2) {
  if (!size || size.width <= 0 || size.height <= 0) {
    return { width: maxExtent, height: maxExtent };
  }

  const aspect = size.width / size.height;

  if (aspect >= 1) {
    return { width: maxExtent, height: maxExtent / aspect };
  }

  return { width: maxExtent * aspect, height: maxExtent };
}

export function getScenePoint(point: Point, imagePlane: ImageSize) {
  return [(point.x - 0.5) * imagePlane.width, (0.5 - point.y) * imagePlane.height, 0.05] as [
    number,
    number,
    number,
  ];
}
