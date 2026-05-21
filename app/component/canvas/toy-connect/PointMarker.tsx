import { useRef } from "react";
import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { gsap, useGSAP } from "./animation";
import { POINT_CONTACT_RADIUS } from "./constants";
import type { ScenePoint } from "./types";

type PointMarkerProps = {
  completeDelay: number;
  connected: boolean;
  completed: boolean;
  errored: boolean;
  number: number;
  onPointerContact: (event: ThreeEvent<PointerEvent>) => void;
  onSelect: (event: ThreeEvent<PointerEvent>) => void;
  position: ScenePoint;
};

export function PointMarker({
  completeDelay,
  connected,
  completed,
  errored,
  number,
  onPointerContact,
  onSelect,
  position,
}: PointMarkerProps) {
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
