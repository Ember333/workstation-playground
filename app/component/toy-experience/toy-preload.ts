import type { Toy, ToyConfig } from "~/lib/toy-connect";
import {
  getToyImageSrc,
  normalizeToy,
  TOY_CONFIG_URL,
} from "~/lib/toy-connect";

const STATIC_IMAGE_ASSETS = [
  "/deskland-wordmark.svg",
  "/deskland-close.svg",
  "/logo-alpha.svg",
  "/%E8%B5%84%E6%BA%90%206.svg",
];

export async function preloadImage(src: string) {
  await new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = async () => {
      try {
        if (typeof image.decode === "function") {
          await image.decode();
        }
      } catch {
        // The browser has still loaded the asset; decode can reject for some SVGs.
      }

      resolve();
    };
    image.onerror = () => reject(new Error(`Unable to load ${src}`));
    image.src = src;
  });
}

export async function loadToyConfig() {
  const response = await fetch(TOY_CONFIG_URL);

  if (!response.ok) {
    throw new Error("Failed to load toy config");
  }

  const value = (await response.json()) as unknown;
  const toys = Array.isArray(value)
    ? value.map((item) => normalizeToy(item as ToyConfig)).filter((item): item is Toy => Boolean(item))
    : [];

  return toys.filter((toy) => toy.points.length >= 4);
}

export async function preloadToyAssets(toys: Toy[]) {
  const imageSources = Array.from(new Set([...STATIC_IMAGE_ASSETS, ...toys.map((toy) => getToyImageSrc(toy.image))]));
  const fontReady =
    typeof document !== "undefined" && "fonts" in document
      ? Promise.all([document.fonts.load('16px "Deskland Comic Sans"'), document.fonts.ready]).then(() => undefined)
      : undefined;

  await Promise.all([...imageSources.map((src) => preloadImage(src)), fontReady].filter(Boolean));
}
