import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import type { OrthographicCamera } from "three";
import { gsap } from "./animation";
import { FIELD_CAMERA_ZOOM, getPlayCameraYOffset, getPlayZoom } from "./layout";
import type { ToyCanvasMode, ToyLayoutItem } from "./types";

type ToyCameraRigProps = {
  items: ToyLayoutItem[];
  mode: ToyCanvasMode;
  selectedToyId: string | null;
};

export function ToyCameraRig({ items, mode, selectedToyId }: ToyCameraRigProps) {
  const camera = useThree((state) => state.camera) as OrthographicCamera;
  const size = useThree((state) => state.size);
  const positionTweenRef = useRef<ReturnType<typeof gsap.to> | null>(null);
  const zoomTweenRef = useRef<ReturnType<typeof gsap.to> | null>(null);
  const selectedItem = items.find((item) => item.toy.id === selectedToyId);
  const targetZoom = mode === "play" ? getPlayZoom(size) : FIELD_CAMERA_ZOOM;
  const targetX = mode === "play" && selectedItem ? selectedItem.position[0] : 0;
  const targetY =
    mode === "play" && selectedItem ? selectedItem.position[1] + getPlayCameraYOffset(size, targetZoom) : 0;

  useEffect(() => {
    positionTweenRef.current?.kill();
    zoomTweenRef.current?.kill();

    const startX = camera.position.x;
    const startY = camera.position.y;
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.hypot(dx, dy);
    const curve = Math.min(0.76, Math.max(0.16, distance * 0.16));
    const controlX = startX + dx * 0.5 - dy * curve;
    const controlY = startY + dy * 0.5 + dx * curve;
    const motion = { progress: 0 };
    const duration = mode === "play" ? 1.02 : 0.78;

    positionTweenRef.current = gsap.to(motion, {
      progress: 1,
      duration,
      ease: "power3.inOut",
      onUpdate: () => {
        const t = motion.progress;
        const inverse = 1 - t;

        camera.position.x = inverse * inverse * startX + 2 * inverse * t * controlX + t * t * targetX;
        camera.position.y = inverse * inverse * startY + 2 * inverse * t * controlY + t * t * targetY;
        camera.position.z = 10;
        camera.updateProjectionMatrix();
      },
    });
    zoomTweenRef.current = gsap.to(camera, {
      zoom: targetZoom,
      duration,
      ease: "power3.inOut",
      overwrite: "auto",
      onUpdate: () => {
        camera.updateProjectionMatrix();
      },
    });

    return () => {
      positionTweenRef.current?.kill();
      zoomTweenRef.current?.kill();
    };
  }, [camera, mode, targetX, targetY, targetZoom]);

  return null;
}
