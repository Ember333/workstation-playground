import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Line, useTexture } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import type { DemoToy, ImageSize } from "~/lib/toy-demo";
import { getContainedImageSize, getScenePoint } from "~/lib/toy-demo";

type ToyConnectCanvasProps = {
  completed: boolean;
  errorIndex: number | null;
  nextIndex: number;
  onPointClick: (index: number) => void;
  toy: DemoToy;
};

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

function ToyScene({ completed, errorIndex, nextIndex, onPointClick, toy }: ToyConnectCanvasProps) {
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

export function ToyConnectCanvas(props: ToyConnectCanvasProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 3.2], fov: 42 }}
      className="home-demo__canvas"
      gl={{ alpha: false, antialias: true }}
    >
      <color attach="background" args={["#ffffff"]} />
      <Suspense fallback={null}>
        <ToyScene {...props} />
      </Suspense>
    </Canvas>
  );
}
