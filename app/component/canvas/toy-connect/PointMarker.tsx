import { useRef } from "react";
import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { gsap, useGSAP } from "./animation";
import { POINT_CONTACT_RADIUS } from "./constants";
import type { ScenePoint } from "./types";

const POINT_NUMBER_WORLD_SCALE = 0.227;

type PointMarkerProps = {
  completeDelay: number;
  connected: boolean;
  completed: boolean;
  errored: boolean;
  number: number;
  numberVisible?: boolean;
  onPointerContact: (event: ThreeEvent<PointerEvent>) => void;
  onSelect: (event: ThreeEvent<PointerEvent>) => void;
  position: ScenePoint;
  showNumber?: boolean;
  visible?: boolean;
};

export function PointMarker({
  completeDelay,
  connected,
  completed,
  errored,
  number,
  numberVisible = true,
  onPointerContact,
  onSelect,
  position,
  showNumber = false,
  visible = true,
}: PointMarkerProps) {
  const markerRef = useRef<HTMLSpanElement>(null);
  const numberTextRef = useRef<HTMLSpanElement>(null);
  const completedRef = useRef(completed);
  const visibleRef = useRef(visible);
  const numberClassName = [
    "toy-connect__point-number",
    connected && !completed ? "is-connected" : "",
    errored ? "is-errored" : "",
  ]
    .filter(Boolean)
    .join(" ");

  useGSAP(
    () => {
      if (!markerRef.current) {
        return;
      }

      if (!visible) {
        visibleRef.current = false;
        gsap.to(markerRef.current, {
          autoAlpha: 0,
          scale: 0,
          duration: 0.2,
          ease: "power2.out",
          overwrite: "auto",
        });
        return;
      }

      if (!completed) {
        completedRef.current = false;

        if (!visibleRef.current) {
          visibleRef.current = true;
          gsap.to(markerRef.current, {
            autoAlpha: 1,
            scale: 1,
            duration: 0.32,
            ease: "back.out(1.35)",
            overwrite: "auto",
          });
          return;
        }

        gsap.set(markerRef.current, { autoAlpha: 1, scale: 1 });
        return;
      }

      if (completedRef.current) {
        gsap.set(markerRef.current, { autoAlpha: 0, scale: 0 });
        return;
      }

      completedRef.current = true;
      gsap.to(markerRef.current, {
        autoAlpha: 0,
        scale: 0,
        duration: 0.34,
        delay: completeDelay,
        ease: "back.in(1.5)",
        overwrite: "auto",
      });
    },
    { dependencies: [completed, completeDelay, visible] },
  );

  useGSAP(
    () => {
      if (!numberTextRef.current) {
        return;
      }

      const textVisible = showNumber && numberVisible;

      if (!textVisible) {
        gsap.set(numberTextRef.current, {
          autoAlpha: 0,
          scale: 0.96,
          overwrite: "auto",
        });
        return;
      }

      gsap.to(numberTextRef.current, {
        autoAlpha: 1,
        scale: 1,
        duration: 0.72,
        ease: "power1.out",
        overwrite: "auto",
      });
    },
    { dependencies: [numberVisible, showNumber] },
  );

  return (
    <group position={position}>
      <mesh onPointerDown={onSelect} onPointerEnter={onPointerContact}>
        <circleGeometry args={[POINT_CONTACT_RADIUS, 32]} />
        <meshBasicMaterial depthWrite={false} transparent opacity={0} />
      </mesh>
      <Html
        center
        pointerEvents="none"
        transform
        position={[0, 0, 0.002]}
        scale={POINT_NUMBER_WORLD_SCALE}
        style={{ pointerEvents: "none" }}
        zIndexRange={[50, 0]}
      >
        <span className={numberClassName} ref={markerRef}>
          <span className="toy-connect__point-number-text" ref={numberTextRef}>
            {showNumber ? number : ""}
          </span>
        </span>
      </Html>
    </group>
  );
}
