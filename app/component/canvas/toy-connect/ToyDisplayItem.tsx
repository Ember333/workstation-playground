import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import type { Group } from "three";
import { gsap, useGSAP } from "./animation";
import { PLAY_FRAME_SIZE } from "./layout";
import { ToyConnectScene } from "./ToyConnectScene";
import type { FieldVariant, ScenePoint, ToyCanvasMode, ToyLayoutItem } from "./types";

type ToyDisplayItemProps = {
  completed: boolean;
  errorIndex: number | null;
  interactive: boolean;
  item: ToyLayoutItem;
  mode: ToyCanvasMode;
  nextIndex: number;
  onClick: (event: ThreeEvent<PointerEvent>) => void;
  onPointClick: (index: number) => void;
  selected: boolean;
  variant: FieldVariant;
  visible: boolean;
};

export function ToyDisplayItem({
  completed,
  errorIndex,
  interactive,
  item,
  mode,
  nextIndex,
  onClick,
  onPointClick,
  selected,
  variant,
  visible,
}: ToyDisplayItemProps) {
  const groupRef = useRef<Group>(null);
  const floatRef = useRef<Group>(null);
  const hasMountedRef = useRef(false);
  const previousVariantRef = useRef<FieldVariant | null>(null);
  const [x, y, z] = item.position;
  const target: ScenePoint = [x, y, z];
  const playSelected = mode === "play" && selected;
  const modelScale = playSelected ? 1 : item.scale / PLAY_FRAME_SIZE;

  useGSAP(
    () => {
      if (!groupRef.current) {
        return;
      }

      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        gsap.set(groupRef.current.position, { x: 0, y: 0, z: target[2] });
        gsap.fromTo(
          groupRef.current.scale,
          { x: 0, y: 0, z: 1 },
          {
            x: visible ? 1 : 0,
            y: visible ? 1 : 0,
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
      const dx = target[0] - current.x;
      const dy = target[1] - current.y;
      const sameSelectFlow = previousVariantRef.current === "select" && variant === "select";
      const distance = Math.hypot(dx, dy);
      const curve = Math.min(0.52, Math.max(0.12, distance * 0.16));
      const controlX = current.x + dx * 0.52 - dy * curve;
      const controlY = current.y + dy * 0.52 + dx * curve;

      if (sameSelectFlow) {
        gsap.to(groupRef.current.position, {
          x: target[0],
          y: target[1],
          z: target[2],
          duration: 0.24,
          delay: item.index * 0.003,
          ease: "power2.out",
          overwrite: "auto",
        });
      } else {
        gsap
          .timeline({ defaults: { overwrite: "auto" } })
          .to(
            groupRef.current.position,
            {
              x: controlX,
              y: controlY,
              z: target[2],
              duration: variant === "showcase" ? 0.42 : 0.34,
              delay: item.index * 0.008,
              ease: "power2.out",
            },
            0,
          )
          .to(groupRef.current.position, {
            x: target[0],
            y: target[1],
            z: target[2],
            duration: variant === "showcase" ? 0.64 : 0.54,
            ease: "power3.inOut",
          });
      }

      gsap.to(groupRef.current.scale, {
        x: visible ? 1 : 0,
        y: visible ? 1 : 0,
        z: 1,
        duration: visible ? 0.52 : 0.24,
        ease: visible ? "back.out(1.45)" : "power2.out",
        overwrite: "auto",
      });
      previousVariantRef.current = variant;
    },
    { dependencies: [target[0], target[1], target[2], visible, variant] },
  );

  useFrame(({ clock }) => {
    if (!floatRef.current) {
      return;
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

  return (
    <group ref={groupRef}>
      <group
        ref={floatRef}
        onPointerUp={(event) => {
          if (interactive) {
            onClick(event);
          }
        }}
      >
        <mesh>
          <circleGeometry args={[Math.max(0.28, item.scale * 0.58), 32]} />
          <meshBasicMaterial depthWrite={false} transparent opacity={0} />
        </mesh>
        <ToyConnectScene
          animateIn={playSelected}
          completed={completed}
          errorIndex={playSelected ? errorIndex : null}
          interactive={playSelected}
          nextIndex={playSelected ? nextIndex : 0}
          onPointClick={onPointClick}
          scale={modelScale}
          showConnectionLines={playSelected}
          showPlaceholder={playSelected}
          showSceneInfo={playSelected}
          toy={item.toy}
          visible={visible}
        />
      </group>
    </group>
  );
}
