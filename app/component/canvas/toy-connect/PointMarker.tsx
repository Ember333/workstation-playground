import { useEffect, useMemo, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { CanvasTexture, Sprite, SpriteMaterial } from "three";
import { CanvasTexture as ThreeCanvasTexture, SRGBColorSpace } from "three";
import { gsap, useGSAP } from "./animation";
import { POINT_CONTACT_RADIUS } from "./constants";
import type { ScenePoint } from "./types";

const POINT_MARKER_SIZE = 0.24;
const POINT_DOT_RADIUS = 38;
const POINT_TEXTURE_SIZE = 128;

type PointMarkerProps = {
  completeDelay: number;
  connected: boolean;
  completed: boolean;
  completionBurstActive?: boolean;
  errored: boolean;
  number: number;
  numberVisible?: boolean;
  onPointerContact: (event: ThreeEvent<PointerEvent>) => void;
  onSelect: (event: ThreeEvent<PointerEvent>) => void;
  position: ScenePoint;
  showNumber?: boolean;
  visible?: boolean;
};

function createTexture(draw: (context: CanvasRenderingContext2D, center: number) => void) {
  if (typeof document === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = POINT_TEXTURE_SIZE;
  canvas.height = POINT_TEXTURE_SIZE;

  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  draw(context, POINT_TEXTURE_SIZE / 2);

  const texture = new ThreeCanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;

  return texture;
}

function createDotTexture(connected: boolean, errored: boolean) {
  return createTexture((context, center) => {
    const fill = errored ? "#dc2626" : "#050505";

    if (connected && !errored) {
      context.fillStyle = "rgba(5, 5, 5, 0.14)";
      context.beginPath();
      context.arc(center, center, 52, 0, Math.PI * 2);
      context.fill();
    }

    context.fillStyle = fill;
    context.beginPath();
    context.arc(center, center, POINT_DOT_RADIUS, 0, Math.PI * 2);
    context.fill();
  });
}

function createNumberTexture(number: number) {
  return createTexture((context, center) => {
    context.fillStyle = "#ffffff";
    context.font = '400 46px "Poppins", "Noto Sans SC", Arial, sans-serif';
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(number), center, center + 1);
  });
}

export function PointMarker({
  completeDelay,
  connected,
  completed,
  completionBurstActive = false,
  errored,
  number,
  numberVisible = true,
  onPointerContact,
  onSelect,
  position,
  showNumber = false,
  visible = true,
}: PointMarkerProps) {
  const dotSpriteRef = useRef<Sprite>(null);
  const numberSpriteRef = useRef<Sprite>(null);
  const dotMaterialRef = useRef<SpriteMaterial>(null);
  const numberMaterialRef = useRef<SpriteMaterial>(null);
  const completionAnimationRunRef = useRef(false);
  const visibleRef = useRef(visible);
  const dotTexture = useMemo<CanvasTexture | null>(
    () => createDotTexture(connected && !completed, errored),
    [connected, completed, errored],
  );
  const numberTexture = useMemo<CanvasTexture | null>(() => createNumberTexture(number), [number]);

  useEffect(() => {
    return () => {
      dotTexture?.dispose();
      numberTexture?.dispose();
    };
  }, [dotTexture, numberTexture]);

  useGSAP(
    () => {
      if (!dotSpriteRef.current || !numberSpriteRef.current || !dotMaterialRef.current || !numberMaterialRef.current) {
        return;
      }

      const markerScales = [dotSpriteRef.current.scale, numberSpriteRef.current.scale];

      if (!visible) {
        visibleRef.current = false;
        gsap.to(markerScales, {
          x: 0,
          y: 0,
          z: 1,
          duration: 0.2,
          ease: "power2.out",
          overwrite: "auto",
        });
        gsap.to([dotMaterialRef.current, numberMaterialRef.current], {
          opacity: 0,
          duration: 0.2,
          ease: "power2.out",
          overwrite: "auto",
        });
        return;
      }

      if (!completed) {
        completionAnimationRunRef.current = false;

        if (!visibleRef.current) {
          visibleRef.current = true;
          gsap.to(markerScales, {
            x: POINT_MARKER_SIZE,
            y: POINT_MARKER_SIZE,
            z: 1,
            duration: 0.32,
            ease: "back.out(1.35)",
            overwrite: "auto",
          });
          gsap.to(dotMaterialRef.current, {
            opacity: 1,
            duration: 0.24,
            ease: "power2.out",
            overwrite: "auto",
          });
          return;
        }

        gsap.set(markerScales, { x: POINT_MARKER_SIZE, y: POINT_MARKER_SIZE, z: 1 });
        gsap.set(dotMaterialRef.current, { opacity: 1 });
        return;
      }

      if (!completionBurstActive) {
        gsap.set(markerScales, { x: 0, y: 0, z: 1 });
        gsap.set([dotMaterialRef.current, numberMaterialRef.current], { opacity: 0 });
        return;
      }

      if (completionAnimationRunRef.current) {
        return;
      }

      completionAnimationRunRef.current = true;
      visibleRef.current = true;

      gsap
        .timeline({ defaults: { overwrite: "auto" } })
        .set(markerScales, { x: POINT_MARKER_SIZE, y: POINT_MARKER_SIZE, z: 1 })
        .set([dotMaterialRef.current, numberMaterialRef.current], { opacity: 1 })
        .to(
          markerScales,
          {
            x: 0,
            y: 0,
            z: 1,
            duration: 0.42,
            delay: completeDelay,
            ease: "back.in(1.5)",
          },
          0,
        )
        .set([dotMaterialRef.current, numberMaterialRef.current], { opacity: 0 });
    },
    { dependencies: [completed, completeDelay, completionBurstActive, visible] },
  );

  useGSAP(
    () => {
      if (!numberSpriteRef.current || !numberMaterialRef.current) {
        return;
      }

      if (completed) {
        return;
      }

      const textVisible = showNumber && numberVisible;

      if (!textVisible) {
        gsap.set(numberSpriteRef.current.scale, {
          x: POINT_MARKER_SIZE * 0.96,
          y: POINT_MARKER_SIZE * 0.96,
          z: 1,
        });
        gsap.set(numberMaterialRef.current, { opacity: 0 });
        return;
      }

      gsap.to(numberSpriteRef.current.scale, {
        x: POINT_MARKER_SIZE,
        y: POINT_MARKER_SIZE,
        z: 1,
        duration: 0.72,
        ease: "power1.out",
        overwrite: "auto",
      });
      gsap.to(numberMaterialRef.current, {
        opacity: 1,
        duration: 0.72,
        ease: "power1.out",
        overwrite: "auto",
      });
    },
    { dependencies: [completed, numberVisible, showNumber] },
  );

  const initialMarkerSize = completed && !completionBurstActive ? 0 : POINT_MARKER_SIZE;
  const initialOpacity = completed && !completionBurstActive ? 0 : 1;

  return (
    <group position={position}>
      <mesh onPointerDown={onSelect} onPointerEnter={onPointerContact} onPointerMove={onPointerContact}>
        <circleGeometry args={[POINT_CONTACT_RADIUS, 32]} />
        <meshBasicMaterial depthWrite={false} transparent opacity={0} />
      </mesh>
      {dotTexture && numberTexture && (
        <group position={[0, 0, 0.002]}>
          <sprite ref={dotSpriteRef} renderOrder={20} scale={[initialMarkerSize, initialMarkerSize, 1]}>
            <spriteMaterial
              ref={dotMaterialRef}
              map={dotTexture}
              transparent
              depthWrite={false}
              depthTest={false}
              opacity={initialOpacity}
            />
          </sprite>
          <sprite ref={numberSpriteRef} renderOrder={21} scale={[initialMarkerSize, initialMarkerSize, 1]}>
            <spriteMaterial
              ref={numberMaterialRef}
              map={numberTexture}
              transparent
              depthWrite={false}
              depthTest={false}
              opacity={initialOpacity}
            />
          </sprite>
        </group>
      )}
    </group>
  );
}
