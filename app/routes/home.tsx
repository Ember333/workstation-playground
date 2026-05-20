import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Line, useTexture } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import type { Route } from "./+types/home";

type Point = {
  x: number;
  y: number;
};

type ToyConfig = {
  id?: string;
  name?: string;
  description?: string;
  image?: string;
  points?: Point[];
};

type DemoToy = {
  id: string;
  name: string;
  description: string;
  image: string;
  points: Point[];
};

type ImageSize = {
  width: number;
  height: number;
};

const CONFIG_URL = "/toy-configs.json";
const MIN_DEMO_POINTS = 4;
const PREFERRED_IMAGES = new Set(["image14.png", "image15.png", "image14", "image15"]);

export function meta({}: Route.MetaArgs) {
  return [{ title: "Toy Connect Demo" }];
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function normalizeToy(toy: ToyConfig): DemoToy | null {
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

function chooseDemoToy(toys: DemoToy[]) {
  const usableToys = toys.filter((toy) => toy.points.length >= MIN_DEMO_POINTS);

  return (
    usableToys.find((toy) => PREFERRED_IMAGES.has(toy.image) || PREFERRED_IMAGES.has(toy.id)) ??
    usableToys[0] ??
    null
  );
}

function getContainedImageSize(size: ImageSize | null) {
  if (!size || size.width <= 0 || size.height <= 0) {
    return { width: 2, height: 2 };
  }

  const aspect = size.width / size.height;

  if (aspect >= 1) {
    return { width: 2, height: 2 / aspect };
  }

  return { width: 2 * aspect, height: 2 };
}

function getScenePoint(point: Point, imagePlane: ImageSize) {
  return [(point.x - 0.5) * imagePlane.width, (0.5 - point.y) * imagePlane.height, 0.05] as [
    number,
    number,
    number,
  ];
}

function PointMarker({
  active,
  errored,
  onSelect,
  position,
}: {
  active: boolean;
  errored: boolean;
  onSelect: (event: ThreeEvent<PointerEvent>) => void;
  position: [number, number, number];
}) {
  return (
    <group position={position}>
      <mesh onPointerDown={onSelect}>
        <circleGeometry args={[0.105, 32]} />
        <meshBasicMaterial depthWrite={false} transparent opacity={0} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <circleGeometry args={[active ? 0.042 : 0.034, 32]} />
        <meshBasicMaterial color={errored ? "#dc2626" : "#050505"} />
      </mesh>
    </group>
  );
}

function ToyScene({
  completed,
  errorIndex,
  nextIndex,
  onPointClick,
  toy,
}: {
  completed: boolean;
  errorIndex: number | null;
  nextIndex: number;
  onPointClick: (index: number) => void;
  toy: DemoToy;
}) {
  const [sourceSize, setSourceSize] = useState<ImageSize | null>(null);
  const imagePlane = useMemo(() => getContainedImageSize(sourceSize), [sourceSize]);
  const clickedPoints = toy.points.slice(0, nextIndex).map((point) => getScenePoint(point, imagePlane));
  const linePoints =
    completed && clickedPoints.length > 1 ? [...clickedPoints, clickedPoints[0]] : clickedPoints;

  return (
    <>
      <mesh>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <ImagePlane
        completed={completed}
        imagePlane={imagePlane}
        onImageSize={setSourceSize}
        src={`/pics/${toy.image}`}
      />
      {linePoints.length > 1 && (
        <Line points={linePoints} color="#050505" lineWidth={3} transparent opacity={0.9} />
      )}
      {toy.points.map((point, index) => (
        <PointMarker
          active={index === nextIndex && !completed}
          errored={index === errorIndex}
          key={`${toy.image}-point-${index}`}
          position={getScenePoint(point, imagePlane)}
          onSelect={(event) => {
            event.stopPropagation();
            onPointClick(index);
          }}
        />
      ))}
    </>
  );
}

function ImagePlane({
  completed,
  imagePlane,
  onImageSize,
  src,
}: {
  completed: boolean;
  imagePlane: ImageSize;
  onImageSize: (size: ImageSize) => void;
  src: string;
}) {
  const texture = useTexture(src);

  useEffect(() => {
    const image = texture.image as HTMLImageElement | undefined;

    onImageSize({
      width: image?.naturalWidth || image?.width || 1,
      height: image?.naturalHeight || image?.height || 1,
    });
  }, [onImageSize, texture]);

  return (
    <mesh>
      <planeGeometry args={[imagePlane.width, imagePlane.height]} />
      <meshBasicMaterial map={texture} transparent opacity={completed ? 1 : 0.035} />
    </mesh>
  );
}

export default function Home() {
  const [toy, setToy] = useState<DemoToy | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [nextIndex, setNextIndex] = useState(0);
  const [errorIndex, setErrorIndex] = useState<number | null>(null);
  const completed = Boolean(toy && nextIndex >= toy.points.length);

  useEffect(() => {
    let cancelled = false;

    async function loadToyConfig() {
      try {
        const response = await fetch(CONFIG_URL);

        if (!response.ok) {
          throw new Error("Failed to load toy config");
        }

        const value = (await response.json()) as unknown;
        const toys = Array.isArray(value)
          ? value.map((item) => normalizeToy(item as ToyConfig)).filter((item): item is DemoToy => Boolean(item))
          : [];
        const selectedToy = chooseDemoToy(toys);

        if (cancelled) {
          return;
        }

        setToy(selectedToy);
        setLoadState(selectedToy ? "ready" : "empty");
      } catch {
        if (!cancelled) {
          setLoadState("error");
        }
      }
    }

    loadToyConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  function handlePointClick(index: number) {
    if (!toy || completed) {
      return;
    }

    if (index !== nextIndex) {
      setErrorIndex(index);
      window.setTimeout(() => setErrorIndex(null), 180);
      return;
    }

    setErrorIndex(null);
    setNextIndex(index + 1);
  }

  return (
    <main className="home-demo">
      <section className="home-demo__stage" aria-label="Toy connection demo">
        {toy && loadState === "ready" ? (
          <Canvas
            camera={{ position: [0, 0, 3.2], fov: 42 }}
            className="home-demo__canvas"
            gl={{ alpha: false, antialias: true }}
          >
            <color attach="background" args={["#ffffff"]} />
            <Suspense fallback={null}>
              <ToyScene
                completed={completed}
                errorIndex={errorIndex}
                nextIndex={nextIndex}
                onPointClick={handlePointClick}
                toy={toy}
              />
            </Suspense>
          </Canvas>
        ) : (
          <p className="home-demo__message">
            {loadState === "loading"
              ? "Loading toy..."
              : loadState === "empty"
                ? "No toy with enough points is available."
                : "Unable to load toy-configs.json."}
          </p>
        )}
      </section>

      <section className="home-demo__info" aria-live="polite">
        {toy && completed ? (
          <>
            <h1>{toy.name}</h1>
            <p>{toy.description || toy.image}</p>
          </>
        ) : (
          <>
            <h1>{toy ? `${nextIndex}/${toy.points.length}` : "Toy Connect"}</h1>
            <p>Tap the black dots in order.</p>
          </>
        )}
      </section>
    </main>
  );
}
