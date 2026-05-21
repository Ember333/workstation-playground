import { useMemo, useRef, useState } from "react";
import { Line } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import type { Group } from "three";
import { getContainedImageSize, getScenePoint, getToyImageSrc } from "~/lib/toy-connect";
import {
  CONNECTION_LINE_Z,
  POINTER_LINE_Z,
  POINT_Z,
  SCENE_INFO_DROP_RATIO,
  SCENE_INFO_GAP_RATIO,
  SCENE_INFO_GROUP_LIFT_RATIO,
} from "./constants";
import { ExplodingLineSegment } from "./ExplodingLineSegment";
import { ImagePlane } from "./ImagePlane";
import { PLAY_FRAME_SIZE, SELECT_TOY_SCALE } from "./layout";
import { PointMarker } from "./PointMarker";
import { gsap, useGSAP } from "./animation";
import { getCompletionDelay, getLocalPointerPoint, getQuestionRotation } from "./scene-helpers";
import { ToySceneInfo } from "./ToySceneInfo";
import type { ScenePoint, ToyConnectSceneProps } from "./types";
import type { ImageSize } from "~/lib/toy-connect";

export function ToyConnectScene({
  animateIn = false,
  completed,
  errorIndex,
  frameSize = PLAY_FRAME_SIZE,
  interactive,
  nextIndex,
  onPointClick,
  position = [0, 0, 0],
  scale = 1,
  toy,
}: ToyConnectSceneProps) {
  const rootRef = useRef<Group>(null);
  const [sourceSize, setSourceSize] = useState<ImageSize | null>(null);
  const [pointerActive, setPointerActive] = useState(false);
  const pointerActiveRef = useRef(false);
  const [pointerPoint, setPointerPoint] = useState<ScenePoint | null>(null);
  const imagePlane = useMemo(() => {
    const size = getContainedImageSize(sourceSize, frameSize);
    const infoGap = frameSize * SCENE_INFO_GAP_RATIO;

    return {
      ...size,
      frameSize,
      infoGap,
      infoDrop: frameSize * SCENE_INFO_DROP_RATIO,
      groupLift: infoGap * SCENE_INFO_GROUP_LIFT_RATIO,
    };
  }, [frameSize, sourceSize]);
  const scenePoints = toy.points.map((point) => {
    const [x, y] = getScenePoint(point, imagePlane);

    return [x, y, POINT_Z] as ScenePoint;
  });
  const clickedPoints = scenePoints.slice(0, nextIndex);
  const clickedLinePoints = clickedPoints.map(([x, y]) => [x, y, CONNECTION_LINE_Z] as ScenePoint);
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

  useGSAP(
    () => {
      if (!rootRef.current || !animateIn) {
        return;
      }

      gsap.fromTo(
        rootRef.current.scale,
        { x: SELECT_TOY_SCALE, y: SELECT_TOY_SCALE, z: 1 },
        { x: 1, y: 1, z: 1, duration: 0.86, ease: "power3.inOut", overwrite: "auto" },
      );
    },
    { dependencies: [animateIn, toy.id] },
  );

  function updatePointerPoint(event: ThreeEvent<PointerEvent>) {
    setPointerPoint(getLocalPointerPoint(event));
  }

  function setPointerContactActive(active: boolean) {
    pointerActiveRef.current = active;
    setPointerActive(active);
  }

  function handleStagePointerDown(event: ThreeEvent<PointerEvent>) {
    if (!interactive) {
      return;
    }

    setPointerContactActive(true);
    updatePointerPoint(event);
  }

  function handleStagePointerMove(event: ThreeEvent<PointerEvent>) {
    if (!interactive || !pointerActiveRef.current || completed) {
      return;
    }

    updatePointerPoint(event);
  }

  function handleStagePointerEnd() {
    setPointerContactActive(false);
    setPointerPoint(null);
  }

  function handlePointContact(index: number, position: ScenePoint, event: ThreeEvent<PointerEvent>) {
    if (!interactive) {
      return;
    }

    event.stopPropagation();
    setPointerContactActive(true);
    setPointerPoint([position[0], position[1], POINTER_LINE_Z]);

    if (!completed) {
      onPointClick(index);
    }
  }

  return (
    <group ref={rootRef} position={position} scale={scale}>
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
                if (interactive && pointerActiveRef.current) {
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
    </group>
  );
}
