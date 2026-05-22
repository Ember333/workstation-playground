import { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import type { Group } from "three";
import { gsap, useGSAP } from "./animation";
import { POINT_SELECT_CONTACT_RADIUS } from "./constants";
import { FIELD_CAMERA_ZOOM, getSelectZoom, PLAY_FRAME_SIZE } from "./layout";
import { ToyConnectScene } from "./ToyConnectScene";
import type { FieldVariant, ScenePoint, ToyCanvasMode, ToyLayoutItem, ViewportBounds } from "./types";

const ITEM_HIT_SIZE = PLAY_FRAME_SIZE;
const ITEM_HIT_Z = 0.32;
const ENTER_SELECT_DURATION = 2.58;
const RETURN_SHOWCASE_DURATION = 2.28;
const ENTER_SELECT_STAGGER_MAX = 0.72;
const RETURN_SHOWCASE_STAGGER = 0.048;
const QUESTION_REVEAL_BUFFER = 0.08;
const SHOWCASE_RING_ROTATION_SPEED = 0.075;
const SHOWCASE_POSITION_LERP_SPEED = 8.5;
const SHOWCASE_SCALE_LERP_SPEED = 10;

type ToyDisplayItemProps = {
  completed: boolean;
  completionBurstActive: boolean;
  detailsVisible: boolean;
  errorIndex: number | null;
  interactive: boolean;
  item: ToyLayoutItem;
  itemCount: number;
  mode: ToyCanvasMode;
  nextIndex: number;
  onPointClick: (index: number) => void;
  onSelectIntent: () => void;
  sceneInfoExiting: boolean;
  selected: boolean;
  variant: FieldVariant;
  visible: boolean;
  viewport: ViewportBounds;
};

function getCubicBezierPoint(
  start: ScenePoint,
  controlA: ScenePoint,
  controlB: ScenePoint,
  end: ScenePoint,
  progress: number,
): ScenePoint {
  const inverse = 1 - progress;
  const startWeight = inverse * inverse * inverse;
  const controlAWeight = 3 * inverse * inverse * progress;
  const controlBWeight = 3 * inverse * progress * progress;
  const endWeight = progress * progress * progress;

  return [
    start[0] * startWeight + controlA[0] * controlAWeight + controlB[0] * controlBWeight + end[0] * endWeight,
    start[1] * startWeight + controlA[1] * controlAWeight + controlB[1] * controlBWeight + end[1] * endWeight,
    start[2] * startWeight + controlA[2] * controlAWeight + controlB[2] * controlBWeight + end[2] * endWeight,
  ];
}

function getSeedValue(seed: string) {
  return Array.from(seed).reduce((value, char) => {
    return (value * 33 + char.charCodeAt(0)) % 1000003;
  }, 29);
}

function getSeedUnit(seed: string, offset: number) {
  const value = Math.sin(getSeedValue(`${seed}-${offset}`) * 12.9898) * 43758.5453;

  return value - Math.floor(value);
}

function getUnitVector([x, y, z]: ScenePoint): ScenePoint {
  const distance = Math.hypot(x, y);

  if (distance < 0.001) {
    return [0, -1, z];
  }

  return [x / distance, y / distance, z];
}

function getSegmentedBezierPoint(
  firstStart: ScenePoint,
  firstControlA: ScenePoint,
  firstControlB: ScenePoint,
  middle: ScenePoint,
  secondControlA: ScenePoint,
  secondControlB: ScenePoint,
  end: ScenePoint,
  progress: number,
  split = 0.48,
) {
  if (progress <= split) {
    return getCubicBezierPoint(firstStart, firstControlA, firstControlB, middle, progress / split);
  }

  return getCubicBezierPoint(middle, secondControlA, secondControlB, end, (progress - split) / (1 - split));
}

function getShowcaseRotationAt(offsetSeconds = 0) {
  const seconds = typeof performance === "undefined" ? 0 : performance.now() / 1000;

  return (seconds + offsetSeconds) * SHOWCASE_RING_ROTATION_SPEED;
}

function getRotatedPoint([x, y, z]: ScenePoint, rotation: number): ScenePoint {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  return [x * cos - y * sin, x * sin + y * cos, z];
}

function getLerpAlpha(delta: number, speed: number) {
  return 1 - Math.exp(-speed * delta);
}

function lerp(start: number, end: number, alpha: number) {
  return start + (end - start) * alpha;
}

export function ToyDisplayItem({
  completed,
  completionBurstActive,
  detailsVisible,
  errorIndex,
  interactive,
  item,
  itemCount,
  mode,
  nextIndex,
  onPointClick,
  onSelectIntent,
  sceneInfoExiting,
  selected,
  variant,
  visible,
  viewport,
}: ToyDisplayItemProps) {
  const groupRef = useRef<Group>(null);
  const floatRef = useRef<Group>(null);
  const scaleGroupRef = useRef<Group>(null);
  const screenScaleRef = useRef({ value: 0 });
  const hasMountedRef = useRef(false);
  const positionTweenRef = useRef<ReturnType<typeof gsap.to> | null>(null);
  const scaleTweenRef = useRef<ReturnType<typeof gsap.to> | null>(null);
  const questionReadyTweenRef = useRef<ReturnType<typeof gsap.delayedCall> | null>(null);
  const previousVariantRef = useRef<FieldVariant | null>(null);
  const previousModeRef = useRef<ToyCanvasMode | null>(null);
  const selectQuestionReadyRef = useRef(mode === "select");
  const screenScaleCompensationRef = useRef(false);
  const [selectQuestionReady, setSelectQuestionReady] = useState(mode === "select");
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const [x, y, z] = item.position;
  const target: ScenePoint = [x, y, z];
  const playSelected = mode === "play" && selected;
  const sceneInfoVisible = playSelected || sceneInfoExiting;
  const showcase = mode === "showcase";
  const questionVisible = !completed && (mode === "play" || (mode === "select" && selectQuestionReady));
  const placeholderMounted = !completed || completionBurstActive;
  const placeholderVisible = questionVisible || (completed && completionBurstActive);
  const pointSelectionEnabled = interactive && !playSelected && !completed && mode === "showcase";
  const frameSelectionEnabled = interactive && (showcase || completed || mode === "select");
  const visualScale = visible ? (playSelected ? 1 : item.scale / PLAY_FRAME_SIZE) : 0;
  const targetCameraZoom = mode === "select" ? getSelectZoom(size) : FIELD_CAMERA_ZOOM;
  const targetScreenScale = visualScale * targetCameraZoom;

  function updateSelectQuestionReady(ready: boolean) {
    if (selectQuestionReadyRef.current === ready) {
      return;
    }

    selectQuestionReadyRef.current = ready;
    setSelectQuestionReady(ready);
  }

  function scheduleSelectQuestionReady(delay: number) {
    questionReadyTweenRef.current?.kill();
    questionReadyTweenRef.current = gsap.delayedCall(delay, () => {
      questionReadyTweenRef.current = null;
      updateSelectQuestionReady(true);
    });
  }

  useGSAP(
    () => {
      if (!groupRef.current || !scaleGroupRef.current) {
        return;
      }

      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        gsap.set(groupRef.current.position, { x: 0, y: 0, z: target[2] });
        screenScaleRef.current.value = targetScreenScale;
        gsap.fromTo(
          scaleGroupRef.current.scale,
          { x: 0, y: 0, z: 1 },
          {
            x: visualScale,
            y: visualScale,
            z: 1,
            duration: 0.62,
            delay: item.index * 0.018,
            ease: "back.out(1.7)",
            overwrite: "auto",
          },
        );
        const initialPositionTween = gsap.to(groupRef.current.position, {
          x: target[0],
          y: target[1],
          z: target[2],
          duration: 0.82,
          delay: item.index * 0.018,
          ease: "expo.out",
          overwrite: "auto",
          onComplete: () => {
            if (positionTweenRef.current === initialPositionTween) {
              positionTweenRef.current = null;
            }
          },
        });
        positionTweenRef.current = initialPositionTween;
        previousVariantRef.current = variant;
        previousModeRef.current = mode;
        return;
      }

      const current = groupRef.current.position;
      const start: ScenePoint = [current.x, current.y, current.z];
      const dx = target[0] - start[0];
      const dy = target[1] - start[1];
      const previousMode = previousModeRef.current;
      const sameSelectFlow = previousVariantRef.current === "select" && variant === "select";
      const returningToShowcase = previousVariantRef.current === "select" && variant === "showcase";
      const enteringSelect = previousVariantRef.current === "showcase" && variant === "select";
      const selectFlowModeChanged = sameSelectFlow && previousMode !== null && previousMode !== mode;
      const modelDrivenTransition = enteringSelect || returningToShowcase;
      const distance = Math.hypot(dx, dy);
      const curve = Math.min(0.52, Math.max(0.12, distance * 0.16));
      const controlA: ScenePoint = [start[0] + dx * 0.52 - dy * curve, start[1] + dy * 0.52 + dx * curve, target[2]];
      const controlB: ScenePoint = [
        target[0] - dx * 0.22 - dy * curve * 0.42,
        target[1] - dy * 0.22 + dx * curve * 0.42,
        target[2],
      ];
      const position = groupRef.current.position;
      const seed = item.toy.id || item.toy.image || String(item.index);
      const seededDelay = itemCount > 1 ? getSeedUnit(seed, 1) * ENTER_SELECT_STAGGER_MAX : 0;
      const totalQuestionDelay =
        ENTER_SELECT_DURATION + (itemCount > 1 ? ENTER_SELECT_STAGGER_MAX : 0) + QUESTION_REVEAL_BUFFER;

      function animateAlongCurve(
        controlA: ScenePoint,
        controlB: ScenePoint,
        duration: number,
        delay: number,
        ease: string,
        spin = 0,
        onComplete?: () => void,
      ) {
        const motion = { progress: 0 };
        const startRotation = groupRef.current?.rotation.z ?? 0;

        positionTweenRef.current?.kill();
        const tween = gsap.to(motion, {
          progress: 1,
          duration,
          delay,
          ease,
          onUpdate: () => {
            const [nextX, nextY, nextZ] = getCubicBezierPoint(start, controlA, controlB, target, motion.progress);

            position.set(nextX, nextY, nextZ);
            if (groupRef.current) {
              groupRef.current.rotation.z = startRotation + spin * Math.sin(motion.progress * Math.PI);
            }
          },
          onComplete: () => {
            position.set(target[0], target[1], target[2]);
            if (groupRef.current) {
              groupRef.current.rotation.z = 0;
            }
            if (positionTweenRef.current === tween) {
              positionTweenRef.current = null;
            }
            onComplete?.();
          },
          overwrite: "auto",
        });
        positionTweenRef.current = tween;
      }

      function animateEnteringSelect(onComplete?: () => void) {
        const radial = getUnitVector(start);
        const tangent: ScenePoint = [-radial[1], radial[0], target[2]];
        const offscreenDistance = Math.hypot(viewport.width, viewport.height) * 0.62 + PLAY_FRAME_SIZE * 1.25;
        const burst: ScenePoint = [
          start[0] + radial[0] * offscreenDistance + tangent[0] * (0.42 + getSeedUnit(seed, 3) * 0.92),
          start[1] + radial[1] * offscreenDistance + tangent[1] * (0.42 + getSeedUnit(seed, 4) * 0.92),
          target[2],
        ];
        const firstControlA: ScenePoint = [
          start[0] + tangent[0] * 0.72,
          start[1] + tangent[1] * 0.72,
          target[2],
        ];
        const firstControlB: ScenePoint = [
          burst[0] - radial[0] * 1.9 + tangent[0] * 1.25,
          burst[1] - radial[1] * 1.9 + tangent[1] * 1.25,
          target[2],
        ];
        const secondControlA: ScenePoint = [
          burst[0] + tangent[0] * 0.72 - radial[0] * 0.55,
          burst[1] + tangent[1] * 0.72 - radial[1] * 0.55,
          target[2],
        ];
        const secondControlB: ScenePoint = [
          target[0] + tangent[0] * 0.68 + radial[0] * 0.36,
          target[1] + tangent[1] * 0.68 + radial[1] * 0.36,
          target[2],
        ];
        const motion = { progress: 0 };
        const startRotation = groupRef.current?.rotation.z ?? 0;
        const spin = (0.24 + getSeedUnit(seed, 5) * 0.18) * Math.PI;

        positionTweenRef.current?.kill();
        const tween = gsap.to(motion, {
          progress: 1,
          duration: ENTER_SELECT_DURATION,
          delay: seededDelay,
          ease: "power4.inOut",
          onUpdate: () => {
            const [nextX, nextY, nextZ] = getSegmentedBezierPoint(
              start,
              firstControlA,
              firstControlB,
              burst,
              secondControlA,
              secondControlB,
              target,
              motion.progress,
              0.45,
            );

            position.set(nextX, nextY, nextZ);
            if (groupRef.current) {
              groupRef.current.rotation.z = startRotation + spin * Math.sin(motion.progress * Math.PI);
            }
          },
          onComplete: () => {
            position.set(target[0], target[1], target[2]);
            if (groupRef.current) {
              groupRef.current.rotation.z = 0;
            }
            if (positionTweenRef.current === tween) {
              positionTweenRef.current = null;
            }
            onComplete?.();
          },
          overwrite: "auto",
        });
        positionTweenRef.current = tween;
      }

      function animateReturningToShowcase() {
        const columnSide = start[0] < 0 ? -1 : 1;
        const row = Math.floor(item.index / 2);
        const delay = Math.min(0.62, row * RETURN_SHOWCASE_STAGGER);
        const targetEnd = getRotatedPoint(target, getShowcaseRotationAt(delay + RETURN_SHOWCASE_DURATION));
        const sideExit: ScenePoint = [
          columnSide * (viewport.width * 0.5 + PLAY_FRAME_SIZE * 1.18),
          start[1] + (getSeedUnit(seed, 6) - 0.5) * viewport.height * 0.2,
          target[2],
        ];
        const targetRadial = getUnitVector(targetEnd);
        const targetTangent: ScenePoint = [-targetRadial[1] * columnSide, targetRadial[0] * columnSide, target[2]];
        const firstControlA: ScenePoint = [
          start[0] + columnSide * PLAY_FRAME_SIZE * 0.18,
          start[1] + targetTangent[1] * 0.12,
          target[2],
        ];
        const firstControlB: ScenePoint = [
          sideExit[0] - columnSide * PLAY_FRAME_SIZE * 0.45,
          sideExit[1] + targetTangent[1] * 0.72,
          target[2],
        ];
        const secondControlA: ScenePoint = [
          sideExit[0] + columnSide * 0.38,
          sideExit[1] - targetTangent[1] * 0.82,
          target[2],
        ];
        const secondControlB: ScenePoint = [
          targetEnd[0] + columnSide * 1.18 + targetTangent[0] * 0.46,
          targetEnd[1] + targetTangent[1] * 0.46,
          target[2],
        ];
        const motion = { progress: 0 };
        const startRotation = groupRef.current?.rotation.z ?? 0;
        const spin = columnSide * -(0.32 + getSeedUnit(seed, 7) * 0.22) * Math.PI;

        positionTweenRef.current?.kill();
        const tween = gsap.to(motion, {
          progress: 1,
          duration: RETURN_SHOWCASE_DURATION,
          delay,
          ease: "power4.inOut",
          onUpdate: () => {
            const [nextX, nextY, nextZ] = getSegmentedBezierPoint(
              start,
              firstControlA,
              firstControlB,
              sideExit,
              secondControlA,
              secondControlB,
              targetEnd,
              motion.progress,
              0.4,
            );

            position.set(nextX, nextY, nextZ);
            if (groupRef.current) {
              groupRef.current.rotation.z = startRotation + spin * Math.sin(motion.progress * Math.PI);
            }
          },
          onComplete: () => {
            position.set(targetEnd[0], targetEnd[1], targetEnd[2]);
            if (groupRef.current) {
              groupRef.current.rotation.z = 0;
            }
            if (positionTweenRef.current === tween) {
              positionTweenRef.current = null;
            }
          },
          overwrite: "auto",
        });
        positionTweenRef.current = tween;
      }

      let skipScaleTween = false;
      let transitionScaleDuration = visible ? 0.36 : 0.22;
      let transitionScaleDelay = 0;

      if (returningToShowcase) {
        questionReadyTweenRef.current?.kill();
        questionReadyTweenRef.current = null;
        updateSelectQuestionReady(false);
      }

      if (sameSelectFlow && !selectFlowModeChanged && positionTweenRef.current === null) {
        screenScaleCompensationRef.current = false;
        groupRef.current.position.set(target[0], target[1], target[2]);
        groupRef.current.rotation.z = 0;
        skipScaleTween = Math.abs(scaleGroupRef.current.scale.x - visualScale) < 0.001;
      } else if (sameSelectFlow) {
        const enteringSelectMode = previousMode !== "select" && mode === "select";

        if (enteringSelectMode) {
          updateSelectQuestionReady(false);
        }

        animateAlongCurve(
          controlA,
          controlB,
          selectFlowModeChanged ? 0.58 : 0.42,
          0,
          "power2.out",
          0,
          enteringSelectMode ? () => updateSelectQuestionReady(true) : undefined,
        );
      } else if (enteringSelect) {
        updateSelectQuestionReady(false);
        animateEnteringSelect();
        scheduleSelectQuestionReady(totalQuestionDelay);
        transitionScaleDelay = seededDelay;
        transitionScaleDuration = ENTER_SELECT_DURATION;
      } else if (returningToShowcase) {
        animateReturningToShowcase();
        transitionScaleDelay = Math.min(0.62, Math.floor(item.index / 2) * RETURN_SHOWCASE_STAGGER);
        transitionScaleDuration = RETURN_SHOWCASE_DURATION;
      } else {
        animateAlongCurve(controlA, controlB, 0.82, item.index * 0.008, "power2.out");
      }

      if (variant === "select" && mode === "select" && !enteringSelect && !selectFlowModeChanged) {
        updateSelectQuestionReady(true);
      }

      if (skipScaleTween) {
        previousVariantRef.current = variant;
        previousModeRef.current = mode;
        return;
      }

      scaleTweenRef.current?.kill();
      screenScaleCompensationRef.current = modelDrivenTransition;
      if (modelDrivenTransition) {
        screenScaleRef.current.value = scaleGroupRef.current.scale.x * Math.max(0.001, camera.zoom);
        scaleTweenRef.current = gsap.to(screenScaleRef.current, {
          value: targetScreenScale,
          duration: transitionScaleDuration,
          delay: transitionScaleDelay,
          ease: visible ? "power3.inOut" : "power2.out",
          overwrite: "auto",
          onComplete: () => {
            if (scaleGroupRef.current) {
              scaleGroupRef.current.scale.set(visualScale, visualScale, 1);
              screenScaleRef.current.value = visualScale * Math.max(0.001, camera.zoom);
            }
            screenScaleCompensationRef.current = false;
            scaleTweenRef.current = null;
          },
        });
      } else {
        scaleTweenRef.current = gsap.to(scaleGroupRef.current.scale, {
          x: visualScale,
          y: visualScale,
          z: 1,
          duration: visible ? 0.36 : 0.22,
          ease: visible ? "power2.out" : "power2.in",
          overwrite: "auto",
          onComplete: () => {
            scaleTweenRef.current = null;
          },
        });
      }
      previousVariantRef.current = variant;
      previousModeRef.current = mode;
    },
    {
      dependencies: [
        target[0],
        target[1],
        target[2],
        visible,
        mode,
        variant,
        targetScreenScale,
        visualScale,
        viewport.width,
        viewport.height,
      ],
    },
  );

  useFrame(({ clock }, delta) => {
    if (!floatRef.current || !groupRef.current || !scaleGroupRef.current) {
      return;
    }

    if (screenScaleCompensationRef.current) {
      const currentZoom = Math.max(0.001, camera.zoom);
      const currentWorldScale = screenScaleRef.current.value / currentZoom;
      scaleGroupRef.current.scale.set(currentWorldScale, currentWorldScale, 1);
    }

    if (variant !== "showcase") {
      floatRef.current.position.y = 0;
      floatRef.current.rotation.z = 0;
      return;
    }

    if (positionTweenRef.current === null) {
      const [rotatedX, rotatedY, rotatedZ] = getRotatedPoint(target, getShowcaseRotationAt());
      const positionAlpha = getLerpAlpha(delta, SHOWCASE_POSITION_LERP_SPEED);

      groupRef.current.position.set(
        lerp(groupRef.current.position.x, rotatedX, positionAlpha),
        lerp(groupRef.current.position.y, rotatedY, positionAlpha),
        lerp(groupRef.current.position.z, rotatedZ, positionAlpha),
      );
    }

    if (!screenScaleCompensationRef.current && scaleTweenRef.current === null) {
      const scaleAlpha = getLerpAlpha(delta, SHOWCASE_SCALE_LERP_SPEED);

      scaleGroupRef.current.scale.set(
        lerp(scaleGroupRef.current.scale.x, visualScale, scaleAlpha),
        lerp(scaleGroupRef.current.scale.y, visualScale, scaleAlpha),
        1,
      );
    }

    const seed = item.index * 0.7;
    floatRef.current.position.y = Math.sin(clock.elapsedTime * 0.8 + seed) * 0.055;
    floatRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.55 + seed) * 0.08;
  });

  function handleItemPointerUp(event: ThreeEvent<PointerEvent>) {
    if (interactive && (mode === "showcase" || mode === "select")) {
      event.stopPropagation();
      onSelectIntent();
    }
  }

  function handleItemPointerDown(event: ThreeEvent<PointerEvent>) {
    if (interactive && (mode === "showcase" || mode === "select")) {
      event.stopPropagation();
    }
  }

  return (
    <group ref={groupRef}>
      <group ref={scaleGroupRef}>
        <group ref={floatRef}>
          {frameSelectionEnabled && (
            <mesh position={[0, 0, ITEM_HIT_Z]} onPointerDown={handleItemPointerDown} onPointerUp={handleItemPointerUp}>
              <planeGeometry args={[ITEM_HIT_SIZE, ITEM_HIT_SIZE]} />
              <meshBasicMaterial depthWrite={false} transparent opacity={0} />
            </mesh>
          )}
          <ToyConnectScene
            animateIn={false}
            completed={completed}
            completionBurstActive={completionBurstActive}
            errorIndex={playSelected ? errorIndex : null}
            forceImageReveal={showcase && completed}
            interactive={playSelected}
            nextIndex={playSelected ? nextIndex : 0}
            onPointClick={onPointClick}
            onPointSelectIntent={onSelectIntent}
            pointSelectionEnabled={pointSelectionEnabled}
            pointSelectionRadius={POINT_SELECT_CONTACT_RADIUS}
            placeholderVisible={placeholderVisible}
            preloadImage={playSelected}
            scale={1}
            showConnectionLines={playSelected}
            showImage={completed && visible}
            showPlaceholder={placeholderMounted}
            showPoints={!completed || playSelected}
            showSceneInfo={sceneInfoVisible}
            detailsVisible={playSelected && detailsVisible}
            toy={item.toy}
            visible={visible}
          />
        </group>
      </group>
    </group>
  );
}
