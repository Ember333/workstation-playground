import { useRef } from "react";
import { Line } from "@react-three/drei";
import type { Group } from "three";
import { gsap, useGSAP } from "./animation";
import { getExplosionDirection, getLineSegmentCenter } from "./scene-helpers";
import type { ScenePoint } from "./types";

type ExplodingLineSegmentProps = {
  index: number;
  points: [ScenePoint, ScenePoint];
  total: number;
};

export function ExplodingLineSegment({ index, points, total }: ExplodingLineSegmentProps) {
  const groupRef = useRef<Group>(null);
  const lineRef = useRef<any>(null);
  const [[startX, startY, startZ], [endX, endY, endZ]] = points;
  const center = getLineSegmentCenter(points);
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
