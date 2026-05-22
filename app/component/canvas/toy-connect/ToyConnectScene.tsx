import { useMemo, useRef, useState } from "react";
import { Line } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import type { Group } from "three";
import { getContainedImageSize, getScenePoint, getToyImageSrc } from "~/lib/toy-connect";
import {
  CONNECTION_LINE_Z,
  POINT_SELECT_CONTACT_RADIUS,
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
  completionBurstActive = false,
  detailsVisible = true,
  errorIndex,
  frameSize = PLAY_FRAME_SIZE,
  interactive,
  nextIndex,
  onPointClick,
  onPointSelectIntent,
  position = [0, 0, 0],
  pointSelectionEnabled = false,
  pointSelectionRadius = POINT_SELECT_CONTACT_RADIUS,
  preloadImage = false,
  scale = 1,
  forceImageReveal = false,
  showConnectionLines = true,
  showImage = completed,
  showPlaceholder = true,
  placeholderVisible = showPlaceholder,
  showPoints = true,
  showSceneInfo = true,
  toy,
  visible = true,
}: ToyConnectSceneProps) {
  const rootRef = useRef<Group>(null);
  const scaleMountedRef = useRef(false);
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
  const shouldDrawConnectionLines = visible && showConnectionLines && !completed;
  const linePoints = shouldDrawConnectionLines ? clickedLinePoints : [];
  const connectedIndex =
    shouldDrawConnectionLines && nextIndex > 0 ? Math.min(nextIndex - 1, toy.points.length - 1) : null;
  const pointerLinePoints =
    shouldDrawConnectionLines && pointerActive && pointerPoint && clickedLinePoints.length > 0
      ? [clickedLinePoints[clickedLinePoints.length - 1], pointerPoint]
      : [];
  const completedLinePoints = scenePoints.map(([x, y]) => [x, y, CONNECTION_LINE_Z] as ScenePoint);
  const completedLineSegments =
    completed && completionBurstActive && visible && showConnectionLines && completedLinePoints.length > 1
      ? completedLinePoints.map((point, index) => {
          const nextPoint = completedLinePoints[(index + 1) % completedLinePoints.length];

          return [point, nextPoint] as [ScenePoint, ScenePoint];
        })
      : [];
  const revealed = showImage && (completed || forceImageReveal);
  const revealDetails = detailsVisible && visible;
  const selectablePoints = pointSelectionEnabled && Boolean(onPointSelectIntent) && visible;
  const pointSelectionPlaneSize = selectablePoints
    ? imagePlane.frameSize + pointSelectionRadius * 2
    : imagePlane.frameSize;

  function getNearestSelectablePoint(position: ScenePoint) {
    return scenePoints.reduce(
      (nearest, scenePoint, index) => {
        const distance = Math.hypot(scenePoint[0] - position[0], scenePoint[1] - position[1]);

        return distance < nearest.distance ? { distance, index } : nearest;
      },
      { distance: Number.POSITIVE_INFINITY, index: -1 },
    );
  }

  useGSAP(
    () => {
      if (!rootRef.current) {
        return;
      }

      if (!scaleMountedRef.current) {
        scaleMountedRef.current = true;
        gsap.set(rootRef.current.scale, {
          x: animateIn ? SELECT_TOY_SCALE : scale,
          y: animateIn ? SELECT_TOY_SCALE : scale,
          z: 1,
        });
      }

      gsap.to(rootRef.current.scale, {
        x: scale,
        y: scale,
        z: 1,
        duration: animateIn ? 0.92 : 0.68,
        ease: "power3.inOut",
        overwrite: "auto",
      });
    },
    { dependencies: [animateIn, scale, toy.id] },
  );

  function updatePointerPoint(event: ThreeEvent<PointerEvent>) {
    setPointerPoint(getLocalPointerPoint(event));
  }

  function setPointerContactActive(active: boolean) {
    pointerActiveRef.current = active;
    setPointerActive(active);
  }

  function handleStagePointerDown(event: ThreeEvent<PointerEvent>) {
    if (selectablePoints && !interactive) {
      const pointerPoint = getLocalPointerPoint(event, POINT_Z);
      const nearest = getNearestSelectablePoint(pointerPoint);

      if (nearest.distance <= pointSelectionRadius) {
        event.stopPropagation();
      }

      return;
    }

    if (!interactive || !visible) {
      return;
    }

    setPointerContactActive(true);
    updatePointerPoint(event);
  }

  function handleStagePointerMove(event: ThreeEvent<PointerEvent>) {
    if (!interactive || !visible || !pointerActiveRef.current || completed) {
      return;
    }

    updatePointerPoint(event);
  }

  function handleStagePointerEnd(event?: ThreeEvent<PointerEvent>) {
    if (selectablePoints && !interactive && event) {
      const pointerPoint = getLocalPointerPoint(event, POINT_Z);
      const nearest = getNearestSelectablePoint(pointerPoint);

      if (nearest.distance <= pointSelectionRadius) {
        event.stopPropagation();
        onPointSelectIntent?.();
        return;
      }
    }

    setPointerContactActive(false);
    setPointerPoint(null);
  }

  function handlePointContact(index: number, position: ScenePoint, event: ThreeEvent<PointerEvent>) {
    if (!interactive || !visible) {
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
    <group ref={rootRef} position={position}>
      <group>
        <group>
          <mesh
            onPointerCancel={handleStagePointerEnd}
            onPointerDown={handleStagePointerDown}
            onPointerLeave={handleStagePointerEnd}
            onPointerMove={handleStagePointerMove}
            onPointerUp={handleStagePointerEnd}
          >
            <planeGeometry args={[pointSelectionPlaneSize, pointSelectionPlaneSize]} />
            <meshBasicMaterial depthWrite={false} transparent opacity={0} />
          </mesh>
          <ImagePlane
            imagePlane={imagePlane}
            onImageSize={setSourceSize}
            placeholderVisible={visible && placeholderVisible}
            preloadImage={preloadImage}
            questionRotation={getQuestionRotation(`${toy.id}-${toy.image}`)}
            revealed={revealed}
            showPlaceholder={visible && showPlaceholder}
            src={getToyImageSrc(toy.image)}
          />
          {!completed && linePoints.length > 1 && (
            <Line
              points={linePoints}
              color="#050505"
              depthWrite={false}
              lineWidth={1.8}
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
              lineWidth={1.8}
              renderOrder={2}
              transparent
              opacity={0.86}
            />
          )}
          {completedLineSegments.map((segment, index) => (
            <ExplodingLineSegment
              index={index}
              key={`${toy.image}-completed-line-${index}`}
              points={segment}
              total={completedLineSegments.length}
            />
          ))}
          {showPoints &&
            toy.points.map((point, index) => (
              <PointMarker
                completeDelay={getCompletionDelay(index, toy.points.length)}
                connected={index === connectedIndex}
                completed={completed}
                completionBurstActive={completionBurstActive}
                errored={index === errorIndex}
                interactive={interactive && visible}
                key={`${toy.image}-point-${index}`}
                number={index + 1}
                numberVisible={interactive && revealDetails}
                position={scenePoints[index]}
                showNumber={interactive}
                visible={visible}
                onPointerContact={(event) => {
                  if (interactive && visible && pointerActiveRef.current) {
                    handlePointContact(index, scenePoints[index], event);
                  }
                }}
                onSelect={(event) => {
                  handlePointContact(index, scenePoints[index], event);
                }}
              />
            ))}
          {showSceneInfo && <ToySceneInfo revealed={revealed && revealDetails} imagePlane={imagePlane} toy={toy} />}
        </group>
      </group>
    </group>
  );
}
