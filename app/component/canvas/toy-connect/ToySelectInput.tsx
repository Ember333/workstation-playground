import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { clampSelectScroll } from "./layout";
import type { ToyCanvasMode, ViewportBounds } from "./types";

type ToySelectInputProps = {
  mode: ToyCanvasMode;
  onDragStateChange: (dragging: boolean) => void;
  onScrollChange: (updater: (current: number) => number) => void;
  toyCount: number;
  viewport: ViewportBounds;
};

const DRAG_THRESHOLD = 7;

export function ToySelectInput({
  mode,
  onDragStateChange,
  onScrollChange,
  toyCount,
  viewport,
}: ToySelectInputProps) {
  const domElement = useThree((state) => state.gl.domElement);
  const dragRef = useRef<{ active: boolean; dragged: boolean; lastY: number; startY: number }>({
    active: false,
    dragged: false,
    lastY: 0,
    startY: 0,
  });

  useEffect(() => {
    if (mode !== "select") {
      dragRef.current.active = false;
      onDragStateChange(false);
      return;
    }

    function updateScroll(delta: number) {
      onScrollChange((current) => clampSelectScroll(current + delta, toyCount, viewport));
    }

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      updateScroll(event.deltaY / 110);
    }

    function handlePointerDown(event: PointerEvent) {
      dragRef.current = { active: true, dragged: false, lastY: event.clientY, startY: event.clientY };
      onDragStateChange(false);
    }

    function handlePointerMove(event: PointerEvent) {
      if (!dragRef.current.active) {
        return;
      }

      const delta = (dragRef.current.lastY - event.clientY) / 88;
      dragRef.current.lastY = event.clientY;
      if (Math.abs(event.clientY - dragRef.current.startY) > DRAG_THRESHOLD) {
        dragRef.current.dragged = true;
        onDragStateChange(true);
      }
      updateScroll(delta);
    }

    function handlePointerEnd() {
      if (dragRef.current.dragged) {
        window.setTimeout(() => onDragStateChange(false), 0);
      } else {
        onDragStateChange(false);
      }

      dragRef.current.active = false;
    }

    domElement.addEventListener("wheel", handleWheel, { passive: false });
    domElement.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);

    return () => {
      domElement.removeEventListener("wheel", handleWheel);
      domElement.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
    };
  }, [domElement, mode, onDragStateChange, onScrollChange, toyCount, viewport]);

  return null;
}
