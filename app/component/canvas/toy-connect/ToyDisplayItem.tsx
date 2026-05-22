import { useRef } from "react";
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
const ITEM_CENTER_HIT_RADIUS = PLAY_FRAME_SIZE * 0.2;
const ENTER_SELECT_DURATION = 1.62;
const RETURN_SHOWCASE_DURATION = 1.68;

type ToyDisplayItemProps = {
  completed: boolean;
  completionBurstActive: boolean;
  detailsVisible: boolean;
  errorIndex: number | null;
  interactive: boolean;
  item: ToyLayoutItem;
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

export function ToyDisplayItem({
  completed,
  completionBurstActive,
  detailsVisible,
  errorIndex,
  interactive,
  item,
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
  const previousVariantRef = useRef<FieldVariant | null>(null);
  const previousModeRef = useRef<ToyCanvasMode | null>(null);
  const screenScaleCompensationRef = useRef(false);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const [x, y, z] = item.position;
  const target: ScenePoint = [x, y, z];
  const playSelected = mode === "play" && selected;
  const sceneInfoVisible = playSelected || sceneInfoExiting;
  const showcase = mode === "showcase";
  const questionVisible = !showcase && !completed;
  const placeholderVisible = questionVisible || (completed && completionBurstActive);
  const pointSelectionEnabled = interactive && !playSelected && !completed && (mode === "showcase" || mode === "select");
  const frameSelectionEnabled = interactive && (showcase || completed);
  const centerSelectionEnabled = interactive && !playSelected && !completed && mode === "select";
  const visualScale = visible ? (playSelected ? 1 : item.scale / PLAY_FRAME_SIZE) : 0;
  const targetCameraZoom = mode === "select" ? getSelectZoom(size) : FIELD_CAMERA_ZOOM;
  const targetScreenScale = visualScale * targetCameraZoom;

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
        gsap.to(groupRef.current.position, {
          x: target[0],
          y: target[1],
          z: target[2],
          duration: 0.82,
          delay: item.index * 0.018,
          ease: "expo.out",
          overwrite: "auto",
        });
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

      function animateAlongCurve(
        controlA: ScenePoint,
        controlB: ScenePoint,
        duration: number,
        delay: number,
        ease: string,
        spin = 0,
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
          },
          overwrite: "auto",
        });
        positionTweenRef.current = tween;
      }

      let skipScaleTween = false;
      let transitionScaleDuration = visible ? 0.36 : 0.22;

      if (sameSelectFlow && !selectFlowModeChanged && positionTweenRef.current === null) {
        screenScaleCompensationRef.current = false;
        groupRef.current.position.set(target[0], target[1], target[2]);
        groupRef.current.rotation.z = 0;
        skipScaleTween = Math.abs(scaleGroupRef.current.scale.x - visualScale) < 0.001;
      } else if (sameSelectFlow) {
        animateAlongCurve(controlA, controlB, selectFlowModeChanged ? 0.58 : 0.42, 0, "power2.out");
      } else if (enteringSelect) {
        animateAlongCurve(controlA, controlB, ENTER_SELECT_DURATION, item.index * 0.004, "power3.inOut");
        transitionScaleDuration = ENTER_SELECT_DURATION;
      } else if (returningToShowcase) {
        animateAlongCurve(controlA, controlB, RETURN_SHOWCASE_DURATION, item.index * 0.004, "power3.inOut");
        transitionScaleDuration = RETURN_SHOWCASE_DURATION;
      } else {
        animateAlongCurve(controlA, controlB, 0.82, item.index * 0.008, "power2.out");
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

  useFrame(({ clock }) => {
    if (!floatRef.current || !scaleGroupRef.current) {
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
          {centerSelectionEnabled && (
            <mesh position={[0, 0, ITEM_HIT_Z]} onPointerDown={handleItemPointerDown} onPointerUp={handleItemPointerUp}>
              <circleGeometry args={[ITEM_CENTER_HIT_RADIUS, 32]} />
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
            preloadImage={playSelected}
            scale={1}
            showConnectionLines={playSelected}
            showImage={completed && visible}
            showPlaceholder={placeholderVisible}
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
