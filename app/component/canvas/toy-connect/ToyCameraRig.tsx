import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import type { OrthographicCamera } from "three";
import { gsap } from "./animation";
import { FIELD_CAMERA_ZOOM, getPlayZoom } from "./layout";
import type { ToyCanvasMode, ToyLayoutItem } from "./types";

type ToyCameraRigProps = {
  items: ToyLayoutItem[];
  mode: ToyCanvasMode;
  selectedToyId: string | null;
};

export function ToyCameraRig({ items, mode, selectedToyId }: ToyCameraRigProps) {
  const camera = useThree((state) => state.camera) as OrthographicCamera;
  const size = useThree((state) => state.size);
  const selectedItem = items.find((item) => item.toy.id === selectedToyId);
  const targetX = mode === "play" && selectedItem ? selectedItem.position[0] : 0;
  const targetY = mode === "play" && selectedItem ? selectedItem.position[1] : 0;
  const targetZoom = mode === "play" ? getPlayZoom(size) : FIELD_CAMERA_ZOOM;

  useEffect(() => {
    gsap.to(camera.position, {
      x: targetX,
      y: targetY,
      z: 10,
      duration: mode === "play" ? 0.86 : 0.64,
      ease: "power3.inOut",
      overwrite: "auto",
      onUpdate: () => {
        camera.updateProjectionMatrix();
      },
    });
    gsap.to(camera, {
      zoom: targetZoom,
      duration: mode === "play" ? 0.86 : 0.64,
      ease: "power3.inOut",
      overwrite: "auto",
      onUpdate: () => {
        camera.updateProjectionMatrix();
      },
    });
  }, [camera, mode, targetX, targetY, targetZoom]);

  return null;
}
