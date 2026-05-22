import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { installThreeConsoleFilter } from "~/lib/three-console";
import { CanvasReadySignal } from "./toy-connect/CanvasReadySignal";
import {
  clampSelectScroll,
  FIELD_CAMERA_ZOOM,
  getFieldViewport,
  getSelectZoom,
  getToyLayoutItems,
  getViewportForZoom,
} from "./toy-connect/layout";
import { ToyCameraRig } from "./toy-connect/ToyCameraRig";
import { ToyFieldScene } from "./toy-connect/ToyFieldScene";
import { ToySelectInput } from "./toy-connect/ToySelectInput";
import type { ToyConnectCanvasProps } from "./toy-connect/types";

installThreeConsoleFilter();

function ToyCanvasContent({
  completedToyIds,
  errorIndex,
  mode,
  nextIndex,
  onCanvasReady,
  onPointClick,
  onShowcaseClick,
  onToySelect,
  selectedToyId,
  toys,
}: ToyConnectCanvasProps) {
  const [selectScroll, setSelectScroll] = useState(0);
  const [selectDragging, setSelectDragging] = useState(false);
  const [settledCameraKey, setSettledCameraKey] = useState<string | null>(null);
  const selectDraggingRef = useRef(false);
  const size = useThree((state) => state.size);
  const layoutMode = mode === "showcase" ? "showcase" : "select";
  const cameraKey = `${mode}:${selectedToyId ?? "none"}`;
  const viewport = useMemo(
    () => (layoutMode === "select" ? getViewportForZoom(size, getSelectZoom(size)) : getFieldViewport(size)),
    [layoutMode, size],
  );
  const handleCameraMoveComplete = useCallback(() => {
    setSettledCameraKey(cameraKey);
  }, [cameraKey]);
  const handleCameraMoveStart = useCallback(() => {
    setSettledCameraKey(null);
  }, []);
  const detailsVisible = mode === "play" && settledCameraKey === cameraKey;
  const items = useMemo(
    () => getToyLayoutItems(toys, layoutMode, selectScroll, viewport),
    [layoutMode, selectScroll, toys, viewport],
  );

  useEffect(() => {
    setSelectScroll((current) => clampSelectScroll(current, toys.length, viewport));
  }, [toys.length, viewport]);

  return (
    <>
      <color attach="background" args={["#ffffff"]} />
      <ToyCameraRig
        items={items}
        mode={mode}
        selectedToyId={selectedToyId}
        onMoveComplete={handleCameraMoveComplete}
        onMoveStart={handleCameraMoveStart}
      />
      <ToySelectInput
        mode={mode}
        viewport={viewport}
        onDragStateChange={(dragging) => {
          selectDraggingRef.current = dragging;
          setSelectDragging(dragging);
        }}
        onScrollChange={setSelectScroll}
        toyCount={toys.length}
      />
      <ToyFieldScene
        completedToyIds={completedToyIds}
        errorIndex={errorIndex}
        items={items}
        mode={mode}
        nextIndex={nextIndex}
        onPointClick={onPointClick}
        onShowcaseClick={onShowcaseClick}
        onToySelect={onToySelect}
        selectDraggingRef={selectDraggingRef}
        selectDragging={selectDragging}
        selectedToyId={selectedToyId}
        detailsVisible={detailsVisible}
        viewport={viewport}
      />
      <CanvasReadySignal onReady={onCanvasReady} />
    </>
  );
}

export function ToyConnectCanvas(props: ToyConnectCanvasProps) {
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 10], zoom: FIELD_CAMERA_ZOOM, near: 0.1, far: 100 }}
      className="toy-connect__canvas"
      gl={{ alpha: false, antialias: true }}
    >
      <Suspense fallback={null}>
        <ToyCanvasContent {...props} />
      </Suspense>
    </Canvas>
  );
}
