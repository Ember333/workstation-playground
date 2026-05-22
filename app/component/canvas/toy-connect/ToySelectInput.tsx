import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { clampSelectScroll, PLAY_FRAME_SIZE } from "./layout";
import type { ToyCanvasMode, ToyLayoutItem, ViewportBounds } from "./types";

type ToySelectInputProps = {
  items: ToyLayoutItem[];
  mode: ToyCanvasMode;
  onDragStateChange: (dragging: boolean) => void;
  onScrollChange: (updater: (current: number) => number) => void;
  onToySelect: (toyId: string) => void;
  toyCount: number;
  viewport: ViewportBounds;
};

const DRAG_THRESHOLD = 7;
const SELECT_ITEM_HALF_SIZE = PLAY_FRAME_SIZE * 0.5;

export function ToySelectInput({
  items,
  mode,
  onDragStateChange,
  onScrollChange,
  onToySelect,
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
  const pendingDeltaRef = useRef(0);
  const scrollFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (mode !== "select") {
      dragRef.current.active = false;
      onDragStateChange(false);
      return;
    }

    function flushScroll() {
      const delta = pendingDeltaRef.current;

      pendingDeltaRef.current = 0;
      scrollFrameRef.current = null;

      if (delta !== 0) {
        onScrollChange((current) => clampSelectScroll(current + delta, toyCount, viewport));
      }
    }

    function scheduleScroll(delta: number) {
      pendingDeltaRef.current += delta;

      if (scrollFrameRef.current === null) {
        scrollFrameRef.current = window.requestAnimationFrame(flushScroll);
      }
    }

    function selectItemAtPoint(clientX: number, clientY: number) {
      const rect = domElement.getBoundingClientRect();
      const worldX = ((clientX - rect.left) / rect.width - 0.5) * viewport.width;
      const worldY = (0.5 - (clientY - rect.top) / rect.height) * viewport.height;
      const hitItem = items.find((item) => {
        const [itemX, itemY] = item.position;

        return Math.abs(worldX - itemX) <= SELECT_ITEM_HALF_SIZE && Math.abs(worldY - itemY) <= SELECT_ITEM_HALF_SIZE;
      });

      if (hitItem) {
        onToySelect(hitItem.toy.id);
      }
    }

    function isStageTarget(target: EventTarget | null) {
      if (!(target instanceof Element)) {
        return false;
      }

      return Boolean(target.closest(".toy-connect__stage")) && !target.closest(".deskland-nav");
    }

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      scheduleScroll(event.deltaY / 110);
    }

    function startPointerTracking(clientY: number) {
      dragRef.current = { active: true, dragged: false, lastY: clientY, startY: clientY };
      onDragStateChange(false);
    }

    function movePointerTracking(clientY: number) {
      if (!dragRef.current.active) {
        return;
      }

      const delta = (dragRef.current.lastY - clientY) / 88;
      dragRef.current.lastY = clientY;
      if (Math.abs(clientY - dragRef.current.startY) > DRAG_THRESHOLD && !dragRef.current.dragged) {
        dragRef.current.dragged = true;
        onDragStateChange(true);
      }
      scheduleScroll(delta);
    }

    function endPointerTracking(clientX: number, clientY: number) {
      if (!dragRef.current.active) {
        return;
      }

      if (dragRef.current.dragged) {
        window.setTimeout(() => onDragStateChange(false), 0);
      } else {
        onDragStateChange(false);
        selectItemAtPoint(clientX, clientY);
      }

      dragRef.current.active = false;
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.pointerType === "touch") {
        return;
      }

      if (!isStageTarget(event.target)) {
        return;
      }

      startPointerTracking(event.clientY);
    }

    function handlePointerMove(event: PointerEvent) {
      if (event.pointerType === "touch") {
        return;
      }

      movePointerTracking(event.clientY);
    }

    function handlePointerEnd(event: PointerEvent) {
      if (event.pointerType === "touch") {
        return;
      }

      endPointerTracking(event.clientX, event.clientY);
    }

    function handleTouchStart(event: TouchEvent) {
      const touch = event.touches[0];

      if (touch && isStageTarget(event.target)) {
        startPointerTracking(touch.clientY);
      }
    }

    function handleTouchMove(event: TouchEvent) {
      const touch = event.touches[0];

      if (touch) {
        event.preventDefault();
        movePointerTracking(touch.clientY);
      }
    }

    function handleTouchEnd(event: TouchEvent) {
      const touch = event.changedTouches[0];

      if (touch) {
        endPointerTracking(touch.clientX, touch.clientY);
      }
    }

    domElement.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);

    return () => {
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = null;
      }

      pendingDeltaRef.current = 0;
      domElement.removeEventListener("wheel", handleWheel);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
    };
  }, [domElement, items, mode, onDragStateChange, onScrollChange, onToySelect, toyCount, viewport]);

  return null;
}
