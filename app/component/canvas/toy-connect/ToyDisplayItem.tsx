import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import type { Group } from "three";
import { gsap, useGSAP } from "./animation";
import { ToyMiniature } from "./ToyMiniature";
import type { FieldVariant, ScenePoint, ToyLayoutItem } from "./types";

type ToyDisplayItemProps = {
  completed: boolean;
  interactive: boolean;
  item: ToyLayoutItem;
  onClick: (event: ThreeEvent<PointerEvent>) => void;
  variant: FieldVariant;
  visible: boolean;
};

export function ToyDisplayItem({
  completed,
  interactive,
  item,
  onClick,
  variant,
  visible,
}: ToyDisplayItemProps) {
  const groupRef = useRef<Group>(null);
  const floatRef = useRef<Group>(null);
  const hasMountedRef = useRef(false);
  const [x, y, z] = item.position;
  const target: ScenePoint = [x, y, z];

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
        return;
      }

      const current = groupRef.current.position;
      const dx = target[0] - current.x;
      const dy = target[1] - current.y;
      const distance = Math.hypot(dx, dy);
      const curve = Math.min(0.52, Math.max(0.12, distance * 0.16));
      const controlX = current.x + dx * 0.52 - dy * curve;
      const controlY = current.y + dy * 0.52 + dx * curve;

      gsap
        .timeline({ defaults: { overwrite: "auto" } })
        .to(
          groupRef.current.position,
          {
            x: controlX,
            y: controlY,
            z: target[2],
            duration: variant === "showcase" ? 0.38 : 0.32,
            delay: item.index * 0.008,
            ease: "power2.out",
          },
          0,
        )
        .to(groupRef.current.position, {
          x: target[0],
          y: target[1],
          z: target[2],
          duration: variant === "showcase" ? 0.58 : 0.5,
          ease: "power3.inOut",
        });
      gsap.to(groupRef.current.scale, {
        x: visible ? 1 : 0,
        y: visible ? 1 : 0,
        z: 1,
        duration: visible ? 0.52 : 0.24,
        ease: visible ? "back.out(1.45)" : "power2.out",
        overwrite: "auto",
      });
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
        <ToyMiniature completed={completed} scale={item.scale} toy={item.toy} />
      </group>
    </group>
  );
}
