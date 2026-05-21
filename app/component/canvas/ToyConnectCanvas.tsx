import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Html, Line, useTexture } from "@react-three/drei";
import { SRGBColorSpace } from "three";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { ThreeEvent } from "@react-three/fiber";
import type { Group, MeshBasicMaterial } from "three";
import type { ImageSize, Toy } from "~/lib/toy-connect";
import { installThreeConsoleFilter } from "~/lib/three-console";
import { getContainedImageSize, getScenePoint, getToyImageSrc } from "~/lib/toy-connect";

installThreeConsoleFilter();
gsap.registerPlugin(useGSAP);

const SCENE_INFO_GAP_RATIO = 0.14;
const SCENE_INFO_GROUP_LIFT_RATIO = 0.78;
const LANDSCAPE_FRAME_HEIGHT_RATIO = 0.6;
const PHONE_FRAME_WIDTH_RATIO = 0.95;
const PHONE_MAX_CSS_WIDTH = 720;
const POINT_Z = 0.05;
const CONNECTION_LINE_Z = POINT_Z;
const POINTER_LINE_Z = POINT_Z;
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
  completeDelay,
  connected,
  completed,
  errored,
  number,
  onPointerContact,
  onSelect,
  position,
}: {
  completeDelay: number;
  connected: boolean;
  completed: boolean;
  errored: boolean;
  number: number;
  onPointerContact: (event: ThreeEvent<PointerEvent>) => void;
  onSelect: (event: ThreeEvent<PointerEvent>) => void;
  position: ScenePoint;
}) {
  const markerRef = useRef<HTMLSpanElement>(null);
  const labelClassName = [
    "toy-connect__point-number",
    connected ? "is-connected" : "",
    errored ? "is-errored" : "",
  ]
    .filter(Boolean)
    .join(" ");

  useGSAP(
    () => {
      if (!markerRef.current) {
        return;
      }

      if (!completed) {
        gsap.set(markerRef.current, { autoAlpha: 1, scale: 1 });
        return;
      }

      gsap.to(markerRef.current, {
        autoAlpha: 0,
        scale: 0,
        duration: 0.34,
        delay: completeDelay,
        ease: "back.in(1.5)",
        overwrite: "auto",
      });
    },
    { dependencies: [completed, completeDelay], revertOnUpdate: true },
  );

  return (
    <group position={position}>
      <mesh onPointerDown={onSelect} onPointerEnter={onPointerContact}>
        <circleGeometry args={[POINT_CONTACT_RADIUS, 32]} />
        <meshBasicMaterial depthWrite={false} transparent opacity={0} />
      </mesh>
      <Html
        center
        position={[0, 0, 0]}
        style={{ pointerEvents: "none" }}
        zIndexRange={[50, 0]}
      >
        <span className={labelClassName} ref={markerRef}>
          {number}
        </span>
      </Html>
    </group>
  );
}

function getCompletionDelay(index: number, count: number) {
  if (count <= 1) {
    return 0;
  }

  const shuffled = (index * 7) % count;

  return shuffled * 0.035;
}

function getQuestionRotation(seed: string) {
  const hash = Array.from(seed).reduce((value, char) => {
    return (value * 31 + char.charCodeAt(0)) % 1009;
  }, 17);

  return (hash / 1008) * 40 - 20;
}

function getExplosionDirection(center: ScenePoint, index: number, count: number) {
  const fallbackAngle = ((index * 137.5 + 23) % 360) * (Math.PI / 180);
  const centerDistance = Math.hypot(center[0], center[1]);
  const outwardX = centerDistance > 0.001 ? center[0] / centerDistance : Math.cos(fallbackAngle);
  const outwardY = centerDistance > 0.001 ? center[1] / centerDistance : Math.sin(fallbackAngle);
  const distance = count > 8 ? 0.28 : 0.22;
  const drift = ((index % 3) - 1) * 0.035;

  return {
    x: outwardX * distance - outwardY * drift,
    y: outwardY * distance + outwardX * drift,
    rotation: (index % 2 === 0 ? 1 : -1) * (10 + (index % 5) * 3),
  };
}

function ExplodingLineSegment({
  index,
  points,
  total,
}: {
  index: number;
  points: [ScenePoint, ScenePoint];
  total: number;
}) {
  const groupRef = useRef<Group>(null);
  const lineRef = useRef<any>(null);
  const [[startX, startY, startZ], [endX, endY, endZ]] = points;
  const center: ScenePoint = [(startX + endX) * 0.5, (startY + endY) * 0.5, CONNECTION_LINE_Z];
  const localPoints: ScenePoint[] = [
    [startX - center[0], startY - center[1], startZ],
    [endX - center[0], endY - center[1], endZ],
  ];
  const direction = getExplosionDirection(center, index, total);

  useGSAP(
    () => {
      const group = groupRef.current;
      const material = lineRef.current?.material;

      if (!group || !material) {
        return;
      }

      gsap.set(group.position, { x: center[0], y: center[1], z: center[2] });
      gsap.set(group.scale, { x: 1, y: 1, z: 1 });
      gsap.set(group.rotation, { z: 0 });
      gsap.set(material, { opacity: 0.82 });

      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .to(
          group.position,
          {
            x: center[0] + direction.x,
            y: center[1] + direction.y,
            duration: 0.92,
          },
          0,
        )
        .to(group.rotation, { z: (direction.rotation * Math.PI) / 180, duration: 0.92 }, 0)
        .to(group.scale, { x: 1.24, y: 1.24, duration: 0.92 }, 0)
        .to(material, { opacity: 0, duration: 0.72 }, 0.18);
    },
    { dependencies: [center[0], center[1], direction.x, direction.y, direction.rotation], revertOnUpdate: true },
  );

  return (
    <group ref={groupRef}>
      <Line
        ref={lineRef}
        points={localPoints}
        color="#050505"
        depthWrite={false}
        lineWidth={1.4}
        renderOrder={3}
        transparent
        opacity={0.82}
      />
    </group>
  );
}

function getLocalPointerPoint(event: ThreeEvent<PointerEvent>, z = POINTER_LINE_Z): ScenePoint {
  const localPoint = event.object.worldToLocal(event.point.clone());

  return [localPoint.x, localPoint.y, z];
}

function ToySceneInfo({
  revealed,
  imagePlane,
  toy,
}: {
  revealed: boolean;
  imagePlane: SceneImagePlane;
  toy: Toy;
}) {
  const infoRef = useRef<HTMLDivElement>(null);
  const title = revealed ? toy.name : " ";
  const body = revealed ? toy.description || toy.image : " ";
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

      if (!revealed) {
        gsap.set(infoRef.current, { autoAlpha: 0 });
        return;
      }

      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .fromTo(infoRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.46 })
        .fromTo(
          textTargets,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.34, stagger: 0.06 },
          "-=0.28",
        );
    },
    { dependencies: [revealed, title, body], revertOnUpdate: true },
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

function ToyQuestionMark({
  revealed,
  rotation,
}: {
  revealed: boolean;
  rotation: number;
}) {
  const questionRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (!questionRef.current) {
        return;
      }

      if (revealed) {
        gsap.to(questionRef.current, {
          autoAlpha: 0,
          duration: 0.36,
          ease: "power2.out",
          overwrite: "auto",
        });
        return;
      }

      gsap.set(questionRef.current, {
        autoAlpha: 1,
        rotation,
        scale: 1,
      });
    },
    { dependencies: [revealed, rotation], revertOnUpdate: true },
  );

  return (
    <span className="toy-connect__image-question" ref={questionRef}>
      ?
    </span>
  );
}

function RevealedImage({
  imagePlane,
  onImageSize,
  src,
}: {
  imagePlane: SceneImagePlane;
  onImageSize: (size: ImageSize) => void;
  src: string;
}) {
  const texture = useTexture(src);
  const imageGroupRef = useRef<Group>(null);
  const materialRef = useRef<MeshBasicMaterial>(null);

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

  useGSAP(
    () => {
      if (!imageGroupRef.current || !materialRef.current) {
        return;
      }

      gsap
        .timeline()
        .fromTo(
          imageGroupRef.current.scale,
          { x: 0.7, y: 0.7, z: 1 },
          { x: 1, y: 1, z: 1, duration: 0.72, ease: "elastic.out(1, 0.45)" },
          0,
        )
        .fromTo(
          materialRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.42, ease: "power2.out" },
          0,
        );
    },
    { dependencies: [src], revertOnUpdate: true },
  );

  return (
    <group ref={imageGroupRef}>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[imagePlane.width, imagePlane.height]} />
        <meshBasicMaterial
          ref={materialRef}
          depthWrite={false}
          map={texture}
          toneMapped={false}
          transparent
          opacity={0}
        />
      </mesh>
    </group>
  );
}

function ImagePlane({
  questionRotation,
  revealed,
  imagePlane,
  onImageSize,
  src,
}: {
  questionRotation: number;
  revealed: boolean;
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
      {revealed && (
        <Suspense fallback={null}>
          <RevealedImage imagePlane={imagePlane} onImageSize={onImageSize} src={src} />
        </Suspense>
      )}
      <Html
        center
        position={[0, 0, 0.04]}
        style={{ pointerEvents: "none" }}
        zIndexRange={[120, 0]}
      >
        <ToyQuestionMark revealed={revealed} rotation={questionRotation} />
      </Html>
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
  const explodingLineSegments =
    completed && linePoints.length > 1
      ? linePoints.slice(0, -1).map((point, index) => {
          return [point, linePoints[index + 1]] as [ScenePoint, ScenePoint];
        })
      : [];
  const connectedIndex = nextIndex > 0 ? Math.min(nextIndex - 1, toy.points.length - 1) : null;
  const pointerLinePoints =
    !completed && pointerActive && pointerPoint && clickedLinePoints.length > 0
      ? [clickedLinePoints[clickedLinePoints.length - 1], pointerPoint]
      : [];
  const revealed = completed;

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
          imagePlane={imagePlane}
          onImageSize={setSourceSize}
          questionRotation={getQuestionRotation(`${toy.id}-${toy.image}`)}
          revealed={revealed}
          src={getToyImageSrc(toy.image)}
        />
        {!completed && linePoints.length > 1 && (
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
        {explodingLineSegments.map((points, index) => (
          <ExplodingLineSegment
            index={index}
            key={`${toy.image}-line-segment-${index}`}
            points={points}
            total={explodingLineSegments.length}
          />
        ))}
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
            completeDelay={getCompletionDelay(index, toy.points.length)}
            connected={index === connectedIndex}
            completed={completed}
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
        <ToySceneInfo revealed={revealed} imagePlane={imagePlane} toy={toy} />
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
