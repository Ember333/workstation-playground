import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import type { OrthographicCamera } from "three";
import { gsap } from "./animation";
import { FIELD_CAMERA_ZOOM, getPlayCameraYOffset, getPlayZoom, getSelectZoom } from "./layout";
import type { ToyCanvasMode, ToyLayoutItem } from "./types";

function easeInOutCubic(value: number) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function getPanProgress(progress: number, zoomingIn: boolean) {
  return easeInOutCubic(progress);
}

function getZoomProgress(progress: number, zoomingIn: boolean) {
  return easeInOutCubic(progress);
}

function interpolateZoom(startZoom: number, endZoom: number, progress: number) {
  if (startZoom <= 0 || endZoom <= 0) {
    return startZoom + (endZoom - startZoom) * progress;
  }

  return startZoom * Math.pow(endZoom / startZoom, progress);
}

type ToyCameraRigProps = {
  items: ToyLayoutItem[];
  mode: ToyCanvasMode;
  onMoveComplete: () => void;
  onMoveStart: () => void;
  selectedToyId: string | null;
};

export function ToyCameraRig({ items, mode, onMoveComplete, onMoveStart, selectedToyId }: ToyCameraRigProps) {
  const camera = useThree((state) => state.camera) as OrthographicCamera;
  const size = useThree((state) => state.size);
  const cameraTweenRef = useRef<ReturnType<typeof gsap.to> | null>(null);
  const selectedItem = items.find((item) => item.toy.id === selectedToyId);
  const targetZoom = mode === "play" ? getPlayZoom(size) : mode === "select" ? getSelectZoom(size) : FIELD_CAMERA_ZOOM;
  const targetX = mode === "play" && selectedItem ? selectedItem.position[0] : 0;
  const targetY =
    mode === "play" && selectedItem ? selectedItem.position[1] + getPlayCameraYOffset(size, targetZoom) : 0;

  useEffect(() => {
    cameraTweenRef.current?.kill();
    onMoveStart();

    const startX = camera.position.x;
    const startY = camera.position.y;
    const startZoom = camera.zoom;
    const dx = targetX - startX;
    const dy = targetY - startY;
    const zoomingIn = targetZoom > startZoom;
    const motion = { progress: 0 };
    const duration = zoomingIn ? 1.58 : 1.42;

    cameraTweenRef.current = gsap.to(motion, {
      progress: 1,
      duration,
      ease: "power1.inOut",
      onUpdate: () => {
        const panT = getPanProgress(motion.progress, zoomingIn);
        const zoomT = getZoomProgress(motion.progress, zoomingIn);

        camera.position.x = startX + dx * panT;
        camera.position.y = startY + dy * panT;
        camera.position.z = 10;
        camera.zoom = interpolateZoom(startZoom, targetZoom, zoomT);
        camera.updateProjectionMatrix();
      },
      overwrite: "auto",
      onComplete: () => {
        camera.position.x = targetX;
        camera.position.y = targetY;
        camera.position.z = 10;
        camera.zoom = targetZoom;
        camera.updateProjectionMatrix();
        onMoveComplete();
      },
    });

    return () => {
      cameraTweenRef.current?.kill();
    };
  }, [camera, mode, onMoveComplete, onMoveStart, targetX, targetY, targetZoom]);

  return null;
}
