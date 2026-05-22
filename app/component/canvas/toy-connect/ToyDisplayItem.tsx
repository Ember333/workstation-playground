import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import type { Group } from "three";
import { gsap, useGSAP } from "./animation";
import { FIELD_CAMERA_ZOOM, getSelectZoom, PLAY_FRAME_SIZE } from "./layout";
import { ToyConnectScene } from "./ToyConnectScene";
import type { FieldVariant, ScenePoint, ToyCanvasMode, ToyLayoutItem, ViewportBounds } from "./types";

type ToyDisplayItemProps = {
  completed: boolean;
  completionBurstActive: boolean;
  detailsVisible: boolean;
  errorIndex: number | null;
  interactive: boolean;
  item: ToyLayoutItem;
  mode: ToyCanvasMode;
  nextIndex: number;
  onClick: (event: ThreeEvent<PointerEvent>) => void;
  onPointClick: (index: number) => void;
  sceneInfoExiting: boolean;
  selected: boolean;
  variant: FieldVariant;
  visible: boolean;
  viewport: ViewportBounds;
};

function getSeedUnit(seed: string, offset: number) {
  const value = Array.from(`${seed}-${offset}`).reduce((total, char) => {
    return (total * 31 + char.charCodeAt(0)) % 1000003;
  }, 17);
  const unit = Math.sin(value * 12.9898) * 43758.5453;

  return unit - Math.floor(unit);
}

function getVectorUnit(x: number, y: number, fallbackAngle: number) {
  const length = Math.hypot(x, y);

  if (length < 0.001) {
    return {
      x: Math.cos(fallbackAngle),
      y: Math.sin(fallbackAngle),
    };
  }

  return {
    x: x / length,
    y: y / length,
  };
}

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
  onClick,
  onPointClick,
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
  const screenScaleCompensationRef = useRef(false);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const [x, y, z] = item.position;
  const target: ScenePoint = [x, y, z];
  const playSelected = mode === "play" && selected;
  const sceneInfoVisible = playSelected || sceneInfoExiting;
  const showcase = mode === "showcase";
  const questionVisible = !showcase && !completed;
  const visualScale = visible ? (playSelected ? 1 : item.scale / PLAY_FRAME_SIZE) : 0;
  const targetCameraZoom = mode === "select" ? getSelectZoom(size) : FIELD_CAMERA_ZOOM;
  const targetScreenScale = visualScale * targetCameraZoom;
  const hitRadius = mode === "showcase" ? Math.max(0.28, item.scale * 0.42) : PLAY_FRAME_SIZE * 0.45;

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
        return;
      }

      const current = groupRef.current.position;
      const start: ScenePoint = [current.x, current.y, current.z];
      const dx = target[0] - start[0];
      const dy = target[1] - start[1];
      const sameSelectFlow = previousVariantRef.current === "select" && variant === "select";
      const returningToShowcase = previousVariantRef.current === "select" && variant === "showcase";
      const enteringSelect = previousVariantRef.current === "showcase" && variant === "select";
      const modelDrivenTransition = enteringSelect || returningToShowcase;
      const distance = Math.hypot(dx, dy);
      const curve = Math.min(0.52, Math.max(0.12, distance * 0.16));
      const seed = item.toy.id || item.toy.image || `${item.index}`;
      const seedAngle = -Math.PI / 2 + getSeedUnit(seed, 1) * Math.PI * 2;
      const radial = getVectorUnit(start[0], start[1], seedAngle);
      const tangentSign = getSeedUnit(seed, 2) > 0.5 ? 1 : -1;
      const tangent = {
        x: -radial.y * tangentSign,
        y: radial.x * tangentSign,
      };
      const columnSide = start[0] < 0 ? -1 : start[0] > 0 ? 1 : item.index % 2 === 0 ? -1 : 1;
      const fieldSize = Math.min(viewport.width, viewport.height);
      const outwardDistance = fieldSize * (0.24 + getSeedUnit(seed, 3) * 0.12);
      const swirlDistance = fieldSize * (0.2 + getSeedUnit(seed, 4) * 0.1);
      const randomDelay = getSeedUnit(seed, 5) * 0.26;
      const rowDelay = Math.floor(item.index / 2) * 0.032;
      const selectControlA: ScenePoint = [
        start[0] + radial.x * outwardDistance + tangent.x * swirlDistance,
        start[1] + radial.y * outwardDistance + tangent.y * swirlDistance,
        target[2],
      ];
      const selectControlB: ScenePoint = [
        target[0] + radial.x * outwardDistance * 0.5 + tangent.x * swirlDistance * 0.38,
        target[1] + radial.y * outwardDistance * 0.5 + tangent.y * swirlDistance * 0.38,
        target[2],
      ];
      const columnExitX = start[0] + columnSide * (viewport.width * 0.58 + PLAY_FRAME_SIZE * 0.42);
      const columnExitY = start[1] + Math.sin(item.index * 1.7) * 0.22;
      const ringApproachX = target[0] + columnSide * Math.min(0.72, viewport.width * 0.08);
      const ringApproachY = target[1] + Math.sin(item.index * 1.13) * 0.18;
      const controlA: ScenePoint = [start[0] + dx * 0.52 - dy * curve, start[1] + dy * 0.52 + dx * curve, target[2]];
      const controlB: ScenePoint = [
        target[0] - dx * 0.22 - dy * curve * 0.42,
        target[1] - dy * 0.22 + dx * curve * 0.42,
        target[2],
      ];
      const position = groupRef.current.position;

      function animateAlongCurve(controlA: ScenePoint, controlB: ScenePoint, duration: number, delay: number, ease: string) {
        const motion = { progress: 0 };

        positionTweenRef.current?.kill();
        positionTweenRef.current = gsap.to(motion, {
          progress: 1,
          duration,
          delay,
          ease,
          onUpdate: () => {
            const [nextX, nextY, nextZ] = getCubicBezierPoint(start, controlA, controlB, target, motion.progress);

            position.set(nextX, nextY, nextZ);
          },
          onComplete: () => {
            position.set(target[0], target[1], target[2]);
          },
          overwrite: "auto",
        });
      }

      if (sameSelectFlow) {
        positionTweenRef.current?.kill();
        positionTweenRef.current = gsap.to(groupRef.current.position, {
          x: target[0],
          y: target[1],
          z: target[2],
          duration: 0.24,
          delay: item.index * 0.003,
          ease: "power2.out",
          overwrite: "auto",
        });
      } else if (enteringSelect) {
        animateAlongCurve(selectControlA, selectControlB, 1.45, randomDelay, "power2.inOut");
      } else if (returningToShowcase) {
        animateAlongCurve(
          [columnExitX, columnExitY, target[2]],
          [ringApproachX, ringApproachY, target[2]],
          1.5,
          rowDelay,
          "power2.inOut",
        );
      } else {
        animateAlongCurve(controlA, controlB, 0.82, item.index * 0.008, "power2.out");
      }

      scaleTweenRef.current?.kill();
      screenScaleCompensationRef.current = modelDrivenTransition;
      if (modelDrivenTransition) {
        screenScaleRef.current.value = scaleGroupRef.current.scale.x * Math.max(0.001, camera.zoom);
        scaleTweenRef.current = gsap.to(screenScaleRef.current, {
          value: targetScreenScale,
          duration: visible ? 0.52 : 0.24,
          ease: visible ? "power3.inOut" : "power2.out",
          overwrite: "auto",
          onComplete: () => {
            if (scaleGroupRef.current) {
              const currentZoom = Math.max(0.001, camera.zoom);
              const currentWorldScale = targetScreenScale / currentZoom;
              scaleGroupRef.current.scale.set(currentWorldScale, currentWorldScale, 1);
            }
            screenScaleCompensationRef.current = false;
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
        });
      }
      previousVariantRef.current = variant;
    },
    {
      dependencies: [
        target[0],
        target[1],
        target[2],
        visible,
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
      onClick(event);
    }
  }

  return (
    <group ref={groupRef}>
      <group ref={scaleGroupRef}>
        <group ref={floatRef} onPointerUp={handleItemPointerUp}>
          <mesh onPointerUp={handleItemPointerUp}>
            <circleGeometry args={[hitRadius, 32]} />
            <meshBasicMaterial depthWrite={false} transparent opacity={0} />
          </mesh>
          <ToyConnectScene
            animateIn={false}
            completed={completed}
            completionBurstActive={completionBurstActive}
            errorIndex={playSelected ? errorIndex : null}
            forceImageReveal={showcase && completed}
            interactive={playSelected}
            nextIndex={playSelected ? nextIndex : 0}
            onPointClick={onPointClick}
            scale={1}
            showConnectionLines={playSelected}
            showImage={completed && visible}
            showPlaceholder={questionVisible}
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
