import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Html, Line, useTexture } from "@react-three/drei";
import { SRGBColorSpace } from "three";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { ThreeEvent } from "@react-three/fiber";
import type { ImageSize, Toy } from "~/lib/toy-connect";
import { installThreeConsoleFilter } from "~/lib/three-console";
import { getPointLabel } from "~/lib/point-labels";
import { getContainedImageSize, getScenePoint } from "~/lib/toy-connect";

installThreeConsoleFilter();
gsap.registerPlugin(useGSAP);

const SCENE_INFO_GAP_RATIO = 0.14;
const SCENE_INFO_GROUP_LIFT_RATIO = 0.78;
const LANDSCAPE_FRAME_HEIGHT_RATIO = 0.6;
const PHONE_FRAME_WIDTH_RATIO = 0.95;
const PHONE_MAX_CSS_WIDTH = 720;
const POINT_Z = 0.05;
const CONNECTION_LINE_Z = POINT_Z - 0.002;
const POINTER_LINE_Z = CONNECTION_LINE_Z - 0.001;
const POINT_CONTACT_RADIUS = 0.064;

type SceneImagePlane = ImageSize & {
  frameSize: number;
  groupLift: number;
  infoGap: number;
};

type ScenePoint = [number, number, number];

type ToyConnectCanvasProps = {
  completed: boolean;
  errorIndex: number | null;
  nextIndex: number;
  onPointClick: (index: number) => void;
  toy: Toy;
};

function PointMarker({
  connected,
  errored,
  number,
  onPointerContact,
  onSelect,
  position,
}: {
  connected: boolean;
  errored: boolean;
  number: number;
  onPointerContact: (event: ThreeEvent<PointerEvent>) => void;
  onSelect: (event: ThreeEvent<PointerEvent>) => void;
  position: ScenePoint;
}) {
  const labelClassName = [
    "toy-connect__point-number",
    connected ? "is-connected" : "",
    errored ? "is-errored" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <group position={position}>
      <mesh onPointerDown={onSelect} onPointerEnter={onPointerContact}>
        <circleGeometry args={[POINT_CONTACT_RADIUS, 32]} />
        <meshBasicMaterial depthWrite={false} transparent opacity={0} />
      </mesh>
      <Html
        center
        position={[0, 0, 0.03]}
        style={{ pointerEvents: "none" }}
        zIndexRange={[50, 0]}
      >
        <span className={labelClassName}>{getPointLabel(number - 1)}</span>
      </Html>
    </group>
  );
}

function getLocalPointerPoint(event: ThreeEvent<PointerEvent>, z = POINTER_LINE_Z): ScenePoint {
  const localPoint = event.object.worldToLocal(event.point.clone());

  return [localPoint.x, localPoint.y, z];
}

function ToySceneInfo({
  completed,
  imagePlane,
  toy,
}: {
  completed: boolean;
  imagePlane: SceneImagePlane;
  toy: Toy;
}) {
  const infoRef = useRef<HTMLDivElement>(null);
  const title = completed ? toy.name : " ";
  const body = completed ? toy.description || toy.image : " ";
  const position = [0, imagePlane.height * -0.5 - imagePlane.infoGap, 0.16] as [
    number,
    number,
    number,
  ];

  useGSAP(
    () => {
      if (!infoRef.current) {
        return;
      }

      const textTargets = infoRef.current.querySelectorAll("h1, p");

      if (!completed) {
        gsap.set(infoRef.current, { autoAlpha: 0 });
        return;
      }

      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .fromTo(infoRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.36 })
        .fromTo(
          textTargets,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.34, stagger: 0.06 },
          "-=0.22",
        );
    },
    { dependencies: [completed, title, body], revertOnUpdate: true },
  );

  return (
    <Html
      center
      position={position}
      style={{ pointerEvents: "none" }}
      zIndexRange={[100, 0]}
    >
      <div className="toy-connect__scene-info" aria-live="polite" ref={infoRef}>
        <h1>{title}</h1>
        <p>{body}</p>
      </div>
    </Html>
  );
}

function CompletedImage({
  imagePlane,
  onImageSize,
  src,
}: {
  imagePlane: SceneImagePlane;
  onImageSize: (size: ImageSize) => void;
  src: string;
}) {
  const texture = useTexture(src);

  if (texture.colorSpace !== SRGBColorSpace) {
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
  }

  useEffect(() => {
    const image = texture.image as HTMLImageElement | undefined;

    onImageSize({
      width: image?.naturalWidth || image?.width || 1,
      height: image?.naturalHeight || image?.height || 1,
    });
  }, [onImageSize, texture]);

  return (
    <mesh position={[0, 0, 0.01]}>
      <planeGeometry args={[imagePlane.width, imagePlane.height]} />
      <meshBasicMaterial
        depthWrite={false}
        map={texture}
        toneMapped={false}
        transparent
        opacity={1}
      />
    </mesh>
  );
}

function ImagePlane({
  completed,
  imagePlane,
  onImageSize,
  src,
}: {
  completed: boolean;
  imagePlane: SceneImagePlane;
  onImageSize: (size: ImageSize) => void;
  src: string;
}) {
  useEffect(() => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      onImageSize({
        width: image.naturalWidth || image.width || 1,
        height: image.naturalHeight || image.height || 1,
      });
    };
    image.src = src;

    return () => {
      image.onload = null;
    };
  }, [onImageSize, src]);

  return (
    <group>
      <mesh>
        <planeGeometry args={[imagePlane.frameSize, imagePlane.frameSize]} />
        <meshBasicMaterial color="#ffffff" depthWrite={false} transparent opacity={0} />
      </mesh>
      {completed ? (
        <Suspense fallback={null}>
          <CompletedImage imagePlane={imagePlane} onImageSize={onImageSize} src={src} />
        </Suspense>
      ) : (
        <Html
          center
          position={[0, 0, 0.01]}
          style={{ pointerEvents: "none" }}
          zIndexRange={[10, 0]}
        >
          <span className="toy-connect__image-question">❔</span>
        </Html>
      )}
    </group>
  );
}

function ToyScene({ completed, errorIndex, nextIndex, onPointClick, toy }: ToyConnectCanvasProps) {
  const [sourceSize, setSourceSize] = useState<ImageSize | null>(null);
  const [pointerActive, setPointerActive] = useState(false);
  const pointerActiveRef = useRef(false);
  const [pointerPoint, setPointerPoint] = useState<ScenePoint | null>(null);
  const viewportSize = useThree((state) => state.size);
  const viewport = useThree((state) => state.viewport);
  const imagePlane = useMemo(() => {
    const isPhoneSized = viewportSize.width <= PHONE_MAX_CSS_WIDTH;
    const frameSize =
      isPhoneSized || viewport.width <= viewport.height
        ? viewport.width * PHONE_FRAME_WIDTH_RATIO
        : Math.min(viewport.width, viewport.height * LANDSCAPE_FRAME_HEIGHT_RATIO);
    const size = getContainedImageSize(sourceSize, frameSize);
    const infoGap = frameSize * SCENE_INFO_GAP_RATIO;

    return {
      ...size,
      frameSize,
      infoGap,
      groupLift: infoGap * SCENE_INFO_GROUP_LIFT_RATIO,
    };
  }, [sourceSize, viewport.height, viewport.width, viewportSize.width]);
  const scenePoints = toy.points.map((point) => {
    const [x, y] = getScenePoint(point, imagePlane);

    return [x, y, POINT_Z] as [number, number, number];
  });
  const clickedPoints = scenePoints.slice(0, nextIndex);
  const clickedLinePoints = clickedPoints.map(([x, y]) => [x, y, CONNECTION_LINE_Z] as [
    number,
    number,
    number,
  ]);
  const linePoints =
    completed && clickedLinePoints.length > 1
      ? [...clickedLinePoints, clickedLinePoints[0]]
      : clickedLinePoints;
  const connectedIndex = nextIndex > 0 ? Math.min(nextIndex - 1, toy.points.length - 1) : null;
  const pointerLinePoints =
    !completed && pointerActive && pointerPoint && clickedLinePoints.length > 0
      ? [clickedLinePoints[clickedLinePoints.length - 1], pointerPoint]
      : [];

  function updatePointerPoint(event: ThreeEvent<PointerEvent>) {
    setPointerPoint(getLocalPointerPoint(event));
  }

  function setPointerContactActive(active: boolean) {
    pointerActiveRef.current = active;
    setPointerActive(active);
  }

  function handleStagePointerDown(event: ThreeEvent<PointerEvent>) {
    setPointerContactActive(true);
    updatePointerPoint(event);
  }

  function handleStagePointerMove(event: ThreeEvent<PointerEvent>) {
    if (!pointerActiveRef.current || completed) {
      return;
    }

    updatePointerPoint(event);
  }

  function handleStagePointerEnd() {
    setPointerContactActive(false);
    setPointerPoint(null);
  }

  function handlePointContact(index: number, position: ScenePoint, event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    setPointerContactActive(true);
    setPointerPoint([position[0], position[1], POINTER_LINE_Z]);

    if (!completed) {
      onPointClick(index);
    }
  }

  return (
    <group position={[0, imagePlane.groupLift, 0]}>
      <group>
        <mesh
          onPointerCancel={handleStagePointerEnd}
          onPointerDown={handleStagePointerDown}
          onPointerLeave={handleStagePointerEnd}
          onPointerMove={handleStagePointerMove}
          onPointerUp={handleStagePointerEnd}
        >
          <planeGeometry args={[imagePlane.frameSize, imagePlane.frameSize]} />
          <meshBasicMaterial depthWrite={false} transparent opacity={0} />
        </mesh>
        <ImagePlane
          completed={completed}
          imagePlane={imagePlane}
          onImageSize={setSourceSize}
          src={`/pics/${toy.image}`}
        />
        {linePoints.length > 1 && (
          <Line
            points={linePoints}
            color="#050505"
            depthWrite={false}
            lineWidth={1.4}
            renderOrder={1}
            transparent
            opacity={0.78}
          />
        )}
        {pointerLinePoints.length > 1 && (
          <Line
            points={pointerLinePoints}
            color="#050505"
            depthWrite={false}
            lineWidth={1.4}
            renderOrder={2}
            transparent
            opacity={0.86}
          />
        )}
        {toy.points.map((point, index) => (
          <PointMarker
            connected={index === connectedIndex}
            errored={index === errorIndex}
            key={`${toy.image}-point-${index}`}
            number={index + 1}
            position={scenePoints[index]}
            onPointerContact={(event) => {
              if (pointerActiveRef.current) {
                handlePointContact(index, scenePoints[index], event);
              }
            }}
            onSelect={(event) => {
              handlePointContact(index, scenePoints[index], event);
            }}
          />
        ))}
        <ToySceneInfo completed={completed} imagePlane={imagePlane} toy={toy} />
      </group>
    </group>
  );
}

export function ToyConnectCanvas(props: ToyConnectCanvasProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 3.2], fov: 42 }}
      className="toy-connect__canvas"
      gl={{ alpha: false, antialias: true }}
    >
      <color attach="background" args={["#ffffff"]} />
      <Suspense fallback={null}>
        <ToyScene {...props} />
      </Suspense>
    </Canvas>
  );
}
