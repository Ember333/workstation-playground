import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import type { ChangeEvent } from "react";
import { getPointLabel } from "~/lib/point-labels";
import {
  getToyImageSrc,
  normalizeToyImageName,
  TOY_CONFIG_FILE_NAME,
  TOY_CONFIG_URL,
} from "~/lib/toy-connect";
import type { Route } from "./+types/config";

const PICTURE_FILES = [
  "image1.png",
  "image3.png",
  "image4.png",
  "image5.png",
  "image6.png",
  "image7.png",
  "image8.png",
  "image10.png",
  "image11.png",
  "image12.png",
  "image13.png",
  "image14.png",
  "image15.png",
  "image16.png",
  "image17.png",
  "image18.png",
] as const;

const STORAGE_KEY = "toy-config-editor:v1";
const SAVED_STORAGE_KEY = "toy-config-editor:saved";
const AUTO_ALPHA_THRESHOLD = 8;
const AUTO_POINT_COUNT = 48;
const MAX_HISTORY = 80;

type Point = {
  x: number;
  y: number;
};

type ToyConfig = {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  image: string;
  locked: boolean;
  points: Point[];
};

type CanvasSize = {
  width: number;
  height: number;
};

type ConfigSource = {
  toys: ToyConfig[];
  message: string;
};

export function meta({}: Route.MetaArgs) {
  return [{ title: "Toy Config Editor" }];
}

function makeToyConfig(fileName: string): ToyConfig {
  const id = fileName.replace(/\.[^.]+$/, "");

  return {
    id,
    name: id,
    description: "",
    category: "toy",
    difficulty: "normal",
    image: fileName,
    locked: false,
    points: [],
  };
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function getStoredToys() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ToyConfig[]) : null;
  } catch {
    return null;
  }
}

function getSavedToys() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SAVED_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ToyConfig[]) : null;
  } catch {
    return null;
  }
}

function normalizeImageName(image: string) {
  return normalizeToyImageName(image);
}

function normalizeToyConfig(toy: Partial<ToyConfig>, fallbackImage: string): ToyConfig {
  const image = normalizeImageName(toy.image ?? fallbackImage);
  const base = makeToyConfig(image);

  return {
    id: toy.id ?? base.id,
    name: toy.name ?? base.name,
    description: toy.description ?? base.description,
    category: toy.category ?? base.category,
    difficulty: toy.difficulty ?? base.difficulty,
    image,
    locked: toy.locked ?? base.locked,
    points: Array.isArray(toy.points)
      ? toy.points.map((point) => ({
          x: clamp(Number(point.x)),
          y: clamp(Number(point.y)),
        }))
      : [],
  };
}

function mergeToySources(...sources: Array<Array<Partial<ToyConfig>> | null | undefined>) {
  const byImage = new Map<string, ToyConfig>();

  for (const fileName of PICTURE_FILES) {
    byImage.set(fileName, makeToyConfig(fileName));
  }

  for (const source of sources) {
    for (const toy of source ?? []) {
      const image = normalizeImageName(toy.image ?? "");

      if (!image) {
        continue;
      }

      byImage.set(image, normalizeToyConfig({ ...byImage.get(image), ...toy }, image));
    }
  }

  return Array.from(byImage.values()).sort((a, b) =>
    a.image.localeCompare(b.image, undefined, { numeric: true }),
  );
}

function mergeStoredToys(stored: ToyConfig[] | null) {
  return mergeToySources(stored);
}

async function loadConfigFile(): Promise<ConfigSource> {
  try {
    const response = await fetch(`${TOY_CONFIG_URL}?t=${Date.now()}`);

    if (!response.ok) {
      return {
        toys: [],
        message: `No public/${TOY_CONFIG_FILE_NAME} loaded yet`,
      };
    }

    const value = (await response.json()) as unknown;

    if (!Array.isArray(value)) {
      return {
        toys: [],
        message: `public/${TOY_CONFIG_FILE_NAME} is not an array`,
      };
    }

    return {
      toys: mergeToySources(value),
      message: `Loaded ${value.length} toys from public/${TOY_CONFIG_FILE_NAME}`,
    };
  } catch {
    return {
      toys: [],
      message: `No public/${TOY_CONFIG_FILE_NAME} loaded yet`,
    };
  }
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

function downloadJson(fileName: string, value: unknown) {
  const blob = new Blob([formatJson(value)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function readJsonFile(file: File) {
  return new Promise<unknown>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result ?? "")));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function extractAlphaBoundaryPoints(config: ToyConfig) {
  const image = await loadImage(getToyImageSrc(config.image));
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context || width <= 0 || height <= 0) {
    return [];
  }

  canvas.width = width;
  canvas.height = height;
  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0);

  const imageData = context.getImageData(0, 0, width, height).data;
  const isSolid = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return false;
    }

    return imageData[(y * width + x) * 4 + 3] > AUTO_ALPHA_THRESHOLD;
  };

  const boundaryPixels: Array<{ x: number; y: number }> = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!isSolid(x, y)) {
        continue;
      }

      if (
        !isSolid(x - 1, y) ||
        !isSolid(x + 1, y) ||
        !isSolid(x, y - 1) ||
        !isSolid(x, y + 1)
      ) {
        boundaryPixels.push({ x, y });
      }
    }
  }

  if (boundaryPixels.length === 0) {
    return [];
  }

  const center = boundaryPixels.reduce(
    (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }),
    { x: 0, y: 0 },
  );
  center.x /= boundaryPixels.length;
  center.y /= boundaryPixels.length;

  const desiredCount = AUTO_POINT_COUNT;
  const buckets: Array<{ x: number; y: number; angle: number; distance: number } | null> =
    Array.from({ length: desiredCount }, () => null);

  for (const point of boundaryPixels) {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const angle = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2);
    const distance = dx * dx + dy * dy;
    const bucketIndex = Math.min(
      desiredCount - 1,
      Math.floor((angle / (Math.PI * 2)) * desiredCount),
    );
    const existing = buckets[bucketIndex];

    if (!existing || distance > existing.distance) {
      buckets[bucketIndex] = { ...point, angle, distance };
    }
  }

  const sortedBoundary = boundaryPixels
    .map((point) => {
      const dx = point.x - center.x;
      const dy = point.y - center.y;

      return {
        ...point,
        angle: (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2),
      };
    })
    .sort((a, b) => a.angle - b.angle);

  const fallbackPoints = Array.from({ length: desiredCount }, (_, index) => {
    const sourceIndex = Math.floor((index / desiredCount) * sortedBoundary.length);
    return sortedBoundary[sourceIndex];
  });

  const sampledPoints = buckets
    .map((point, index) => point ?? fallbackPoints[index])
    .filter(
      (
        point,
      ): point is {
        x: number;
        y: number;
        angle: number;
      } => Boolean(point),
    )
    .sort((a, b) => a.angle - b.angle)
    .map((point) => ({
      x: clamp(point.x / Math.max(1, width - 1)),
      y: clamp(point.y / Math.max(1, height - 1)),
    }));

  return sampledPoints;
}

export default function Config() {
  const [toys, setToys] = useState(() => mergeStoredToys(null));
  const [history, setHistory] = useState<ToyConfig[][]>([]);
  const [selectedImage, setSelectedImage] = useState<string>(PICTURE_FILES[0]);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [dragPointIndex, setDragPointIndex] = useState<number | null>(null);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 1, height: 1 });
  const [status, setStatus] = useState("Ready");
  const [newImageName, setNewImageName] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const selectedToy = useMemo(
    () => toys.find((toy) => toy.image === selectedImage) ?? toys[0],
    [selectedImage, toys],
  );

  const currentJson = useMemo(() => formatJson(selectedToy), [selectedToy]);
  const allJson = useMemo(() => formatJson(toys), [toys]);

  function pushHistory(snapshot = toys) {
    setHistory((current) => [...current, snapshot].slice(-MAX_HISTORY));
  }

  function replaceToys(nextToys: ToyConfig[], nextSelectedImage = nextToys[0]?.image) {
    pushHistory();
    setToys(nextToys);

    if (nextSelectedImage) {
      setSelectedImage(nextSelectedImage);
    }

    setSelectedPointIndex(null);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialConfig() {
      const configSource = await loadConfigFile();
      const stored = getStoredToys();
      const saved = getSavedToys();

      if (cancelled) {
        return;
      }

      if (saved?.length) {
        setToys(mergeToySources(saved));
        setStatus("Loaded saved browser copy");
        return;
      }

      if (configSource.toys.length > 0) {
        setToys(configSource.toys);
        setStatus(configSource.message);
        return;
      }

      setToys(mergeStoredToys(stored));
      setStatus(configSource.message);
    }

    loadInitialConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, formatJson(toys));
  }, [toys]);

  useEffect(() => {
    let cancelled = false;

    async function drawImage() {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");

      if (!canvas || !context || !selectedToy) {
        return;
      }

      try {
        const image = await loadImage(getToyImageSrc(selectedToy.image));

        if (cancelled) {
          return;
        }

        const width = image.naturalWidth || image.width || 1;
        const height = image.naturalHeight || image.height || 1;
        canvas.width = width;
        canvas.height = height;
        context.clearRect(0, 0, width, height);
        context.drawImage(image, 0, 0);
        setCanvasSize({ width, height });
        setStatus(`Loaded ${selectedToy.image} (${width} x ${height})`);
      } catch {
        setStatus(`Failed to load ${selectedToy.image}`);
      }
    }

    drawImage();

    return () => {
      cancelled = true;
    };
  }, [selectedToy.image]);

  function updateSelectedToy(update: Partial<ToyConfig>) {
    pushHistory();
    setToys((current) =>
      current.map((toy) => (toy.image === selectedToy.image ? { ...toy, ...update } : toy)),
    );
  }

  function updatePoint(index: number, point: Point) {
    const points = selectedToy.points.map((existingPoint, pointIndex) =>
      pointIndex === index ? point : existingPoint,
    );

    updateSelectedToy({ points });
  }

  function getPointFromPointer(event: PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();

    if (!rect || rect.width === 0 || rect.height === 0) {
      return null;
    }

    return {
      x: clamp((event.clientX - rect.left) / rect.width),
      y: clamp((event.clientY - rect.top) / rect.height),
    };
  }

  async function generatePoints() {
    if (selectedToy.locked) {
      setStatus("Unlock this toy before generating points");
      return;
    }

    setStatus("Generating boundary points...");
    const points = await extractAlphaBoundaryPoints(selectedToy);
    updateSelectedToy({ points });
    setSelectedPointIndex(points.length > 0 ? 0 : null);
    setStatus(`Generated ${points.length} boundary points`);
  }

  function addImageByName() {
    const image = normalizeImageName(newImageName.trim());

    if (!image) {
      setStatus("Type an image file name first");
      return;
    }

    if (!/\.(png|webp|jpg|jpeg)$/i.test(image)) {
      setStatus("Use an image file name like image17.png");
      return;
    }

    pushHistory();
    setToys((current) => {
      if (current.some((toy) => toy.image === image)) {
        return current;
      }

      return mergeToySources(current, [makeToyConfig(image)]);
    });
    setSelectedImage(image);
    setSelectedPointIndex(null);
    setNewImageName("");
    setStatus(`Added ${image}`);
  }

  async function reloadConfigFile() {
    const configSource = await loadConfigFile();

    if (configSource.toys.length === 0) {
      setStatus(configSource.message);
      return;
    }

    replaceToys(configSource.toys);
    window.localStorage.setItem(STORAGE_KEY, formatJson(configSource.toys));
    setStatus(configSource.message);
  }

  function saveBrowserCopy() {
    window.localStorage.setItem(SAVED_STORAGE_KEY, allJson);
    window.localStorage.setItem(STORAGE_KEY, allJson);
    setStatus("Saved current editor JSON in browser");
  }

  function loadSavedBrowserCopy() {
    const saved = getSavedToys();

    if (!saved?.length) {
      setStatus("No saved browser copy yet");
      return;
    }

    const nextToys = mergeToySources(saved);
    replaceToys(nextToys);
    window.localStorage.setItem(STORAGE_KEY, formatJson(nextToys));
    setStatus("Loaded saved browser copy");
  }

  function undoLastChange() {
    const previous = history.at(-1);

    if (!previous) {
      setStatus("Nothing to undo");
      return;
    }

    setHistory((current) => current.slice(0, -1));
    setToys(previous);
    setSelectedImage((image) => previous.find((toy) => toy.image === image)?.image ?? previous[0]?.image ?? image);
    setSelectedPointIndex(null);
    setStatus("Undid last edit");
  }

  async function importJsonFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const value = await readJsonFile(file);

      if (!Array.isArray(value)) {
        setStatus("Imported JSON must be an array");
        return;
      }

      const nextToys = mergeToySources(value);
      const nextJson = formatJson(nextToys);
      replaceToys(nextToys);
      window.localStorage.setItem(SAVED_STORAGE_KEY, nextJson);
      window.localStorage.setItem(STORAGE_KEY, nextJson);
      setStatus(`Imported and saved ${file.name}`);
    } catch {
      setStatus(`Failed to import ${file.name}`);
    }
  }

  function addPoint(event: PointerEvent<SVGSVGElement>) {
    if (selectedToy.locked || event.target !== event.currentTarget) {
      return;
    }

    const point = getPointFromPointer(event);

    if (!point) {
      return;
    }

    const points = [...selectedToy.points, point];
    updateSelectedToy({ points });
    setSelectedPointIndex(points.length - 1);
  }

  function deleteSelectedPoint() {
    if (selectedPointIndex === null || selectedToy.locked) {
      return;
    }

    const points = selectedToy.points.filter((_, index) => index !== selectedPointIndex);
    updateSelectedToy({ points });
    setSelectedPointIndex(points.length > 0 ? Math.min(selectedPointIndex, points.length - 1) : null);
  }

  function moveSelectedPoint(offset: -1 | 1) {
    if (selectedPointIndex === null || selectedToy.locked) {
      return;
    }

    const nextIndex = selectedPointIndex + offset;

    if (nextIndex < 0 || nextIndex >= selectedToy.points.length) {
      return;
    }

    const points = [...selectedToy.points];
    [points[selectedPointIndex], points[nextIndex]] = [points[nextIndex], points[selectedPointIndex]];
    updateSelectedToy({ points });
    setSelectedPointIndex(nextIndex);
  }

  return (
    <main className="toy-editor">
      <aside className="toy-sidebar">
        <div className="toy-sidebar__header">
          <h1>Toy Config Editor</h1>
          <p>{toys.length} images in public/tinified</p>
        </div>
        <div className="toy-add-image">
          <input
            aria-label="Add image file name"
            placeholder="image17.png"
            value={newImageName}
            onChange={(event) => setNewImageName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                addImageByName();
              }
            }}
          />
          <button type="button" onClick={addImageByName}>
            {"\u6dfb\u52a0\u56fe\u7247"}
          </button>
        </div>
        <div className="toy-list">
          {toys.map((toy) => (
            <button
              className={`toy-list__item ${toy.image === selectedToy.image ? "is-active" : ""}`}
              key={toy.image}
              type="button"
              onClick={() => {
                setSelectedImage(toy.image);
                setSelectedPointIndex(null);
              }}
            >
              <img alt="" src={getToyImageSrc(toy.image)} />
              <span>
                <strong>{toy.name || toy.id}</strong>
                <small>{toy.image}</small>
              </span>
              <span className="toy-list__count">{toy.points.length}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="toy-workspace">
        <div className="toy-toolbar">
          <div>
            <h2>{selectedToy.name || selectedToy.image}</h2>
            <p>{status}</p>
          </div>
          <div className="toy-toolbar__actions">
            <button className="toy-primary-action" type="button" onClick={saveBrowserCopy}>
              {"\u4fdd\u5b58"}
            </button>
            <button disabled={history.length === 0} type="button" onClick={undoLastChange}>
              {"\u64a4\u9500"}
            </button>
            <button type="button" onClick={loadSavedBrowserCopy}>
              {"\u8f7d\u5165\u4fdd\u5b58"}
            </button>
            <label className="toy-import-button">
              <input accept="application/json,.json" type="file" onChange={importJsonFile} />
              <span>{"\u5bfc\u5165 JSON"}</span>
            </label>
            <button type="button" onClick={reloadConfigFile}>
              {"\u91cd\u8bfb JSON"}
            </button>
            <button disabled={selectedToy.locked} type="button" onClick={generatePoints}>
              {"\u751f\u6210\u8fb9\u754c\u70b9"}
            </button>
            <button
              disabled={selectedPointIndex === null || selectedToy.locked}
              type="button"
              onClick={() => moveSelectedPoint(-1)}
            >
              {"\u4e0a\u79fb\u70b9"}
            </button>
            <button
              disabled={selectedPointIndex === null || selectedToy.locked}
              type="button"
              onClick={() => moveSelectedPoint(1)}
            >
              {"\u4e0b\u79fb\u70b9"}
            </button>
            <button
              disabled={selectedPointIndex === null || selectedToy.locked}
              type="button"
              onClick={deleteSelectedPoint}
            >
              {"\u5220\u9664\u70b9"}
            </button>
          </div>
        </div>

        <div className="toy-canvas-shell">
          <div className="toy-canvas-frame">
            <canvas
              aria-label={`${selectedToy.image} edit canvas`}
              className="toy-canvas"
              ref={canvasRef}
            />
            <svg
              className="toy-point-layer"
              ref={svgRef}
              viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
              onPointerDown={addPoint}
              onPointerMove={(event) => {
                if (dragPointIndex === null || selectedToy.locked) {
                  return;
                }

                const point = getPointFromPointer(event);

                if (point) {
                  updatePoint(dragPointIndex, point);
                }
              }}
              onPointerUp={() => setDragPointIndex(null)}
              onPointerCancel={() => setDragPointIndex(null)}
            >
              {selectedToy.points.length > 1 && (
                <polyline
                  className="toy-boundary-line"
                  points={[...selectedToy.points, selectedToy.points[0]]
                    .map((point) => `${point.x * canvasSize.width},${point.y * canvasSize.height}`)
                    .join(" ")}
                />
              )}
              {selectedToy.points.map((point, index) => (
                <g className="toy-point" key={`point-${index}`}>
                  <circle
                    className="toy-point__hit-area"
                    cx={point.x * canvasSize.width}
                    cy={point.y * canvasSize.height}
                    r={14}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      event.currentTarget.setPointerCapture(event.pointerId);
                      setSelectedPointIndex(index);
                      setDragPointIndex(index);
                    }}
                  />
                  <circle
                    className="toy-point__label-shield"
                    cx={point.x * canvasSize.width}
                    cy={point.y * canvasSize.height}
                    r={9}
                  />
                  <text
                    className={index === selectedPointIndex ? "is-selected" : ""}
                    x={point.x * canvasSize.width}
                    y={point.y * canvasSize.height}
                  >
                    {getPointLabel(index)}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      </section>

      <aside className="toy-inspector">
        <section className="toy-panel">
          <h2>Config</h2>
          <label>
            <span>id</span>
            <input
              value={selectedToy.id}
              onChange={(event) => updateSelectedToy({ id: event.target.value })}
            />
          </label>
          <label>
            <span>name</span>
            <input
              value={selectedToy.name}
              onChange={(event) => updateSelectedToy({ name: event.target.value })}
            />
          </label>
          <label>
            <span>description</span>
            <textarea
              rows={3}
              value={selectedToy.description}
              onChange={(event) => updateSelectedToy({ description: event.target.value })}
            />
          </label>
          <label>
            <span>category</span>
            <input
              value={selectedToy.category}
              onChange={(event) => updateSelectedToy({ category: event.target.value })}
            />
          </label>
          <label>
            <span>difficulty</span>
            <input
              value={selectedToy.difficulty}
              onChange={(event) => updateSelectedToy({ difficulty: event.target.value })}
            />
          </label>
          <label>
            <span>image</span>
            <select
              value={selectedToy.image}
              onChange={(event) => setSelectedImage(event.target.value)}
            >
              {toys.map((toy) => (
                <option key={toy.image} value={toy.image}>
                  {toy.image}
                </option>
              ))}
            </select>
          </label>
          <label className="toy-checkbox">
            <input
              checked={selectedToy.locked}
              type="checkbox"
              onChange={(event) => updateSelectedToy({ locked: event.target.checked })}
            />
            <span>locked</span>
          </label>
        </section>

        <section className="toy-panel">
          <div className="toy-panel__title-row">
            <h2>Points</h2>
            <strong>{selectedToy.points.length}</strong>
          </div>
          <div className="toy-points-list">
            {selectedToy.points.map((point, index) => (
              <button
                className={index === selectedPointIndex ? "is-active" : ""}
                key={`point-row-${index}`}
                type="button"
                onClick={() => setSelectedPointIndex(index)}
              >
                <span>#{index + 1}</span>
                <code>
                  {point.x.toFixed(4)}, {point.y.toFixed(4)}
                </code>
              </button>
            ))}
          </div>
        </section>

        <section className="toy-panel">
          <div className="toy-panel__title-row">
            <h2>Export</h2>
            <button type="button" onClick={() => downloadJson(TOY_CONFIG_FILE_NAME, toys)}>
              {"\u4e0b\u8f7d JSON"}
            </button>
          </div>
          <div className="toy-export-actions">
            <button
              type="button"
              onClick={() => copyText(currentJson).then(() => setStatus("Copied current JSON"))}
            >
              {"\u590d\u5236\u5f53\u524d"}
            </button>
            <button
              type="button"
              onClick={() => copyText(allJson).then(() => setStatus("Copied all JSON"))}
            >
              {"\u590d\u5236\u5168\u90e8"}
            </button>
          </div>
          <label>
            <span>{"\u5f53\u524d\u73a9\u5177 JSON"}</span>
            <textarea readOnly rows={8} value={currentJson} />
          </label>
          <label>
            <span>{"\u5168\u90e8\u73a9\u5177 JSON"}</span>
            <textarea readOnly rows={8} value={allJson} />
          </label>
        </section>
      </aside>
    </main>
  );
}
