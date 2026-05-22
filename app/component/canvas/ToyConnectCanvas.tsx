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
  completionBurstToyId,
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
  const [sceneInfoExitToyId, setSceneInfoExitToyId] = useState<string | null>(null);
  const [settledCameraKey, setSettledCameraKey] = useState<string | null>(null);
  const previousModeRef = useRef<ToyConnectCanvasProps["mode"] | null>(null);
  const previousSelectedToyIdRef = useRef<string | null>(null);
  const selectDraggingRef = useRef(false);
  const size = useThree((state) => state.size);
  const layoutMode = mode === "showcase" ? "showcase" : "select";
  const enteringSelectFromShowcase = previousModeRef.current === "showcase" && mode === "select";
  const layoutSelectScroll = enteringSelectFromShowcase ? 0 : selectScroll;
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
  const handleSelectDragStateChange = useCallback((dragging: boolean) => {
    selectDraggingRef.current = dragging;
    setSelectDragging(dragging);
  }, []);
  const detailsVisible = mode === "play" && settledCameraKey === cameraKey;
  const activeSceneInfoExitToyId =
    sceneInfoExitToyId ??
    (previousModeRef.current === "play" && mode !== "play" ? previousSelectedToyIdRef.current : null);
  const items = useMemo(
    () => getToyLayoutItems(toys, layoutMode, layoutSelectScroll, viewport),
    [layoutMode, layoutSelectScroll, toys, viewport],
  );

  useEffect(() => {
    setSelectScroll((current) => clampSelectScroll(current, toys.length, viewport));
  }, [toys.length, viewport]);

  useEffect(() => {
    const previousMode = previousModeRef.current;
    const previousSelectedToyId = previousSelectedToyIdRef.current;

    previousModeRef.current = mode;
    previousSelectedToyIdRef.current = selectedToyId;

    if (previousMode === "showcase" && mode === "select") {
      setSelectScroll(0);
    }

    if (previousMode === "play" && mode !== "play" && previousSelectedToyId) {
      setSceneInfoExitToyId(previousSelectedToyId);
      const timeout = window.setTimeout(() => {
        setSceneInfoExitToyId((current) => (current === previousSelectedToyId ? null : current));
      }, 620);

      return () => window.clearTimeout(timeout);
    }

    if (mode === "play") {
      setSceneInfoExitToyId(null);
    }
  }, [mode, selectedToyId]);

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
        onDragStateChange={handleSelectDragStateChange}
        onScrollChange={setSelectScroll}
        toyCount={toys.length}
      />
      <ToyFieldScene
        completedToyIds={completedToyIds}
        completionBurstToyId={completionBurstToyId}
        errorIndex={errorIndex}
        items={items}
        mode={mode}
        nextIndex={nextIndex}
        onPointClick={onPointClick}
        onShowcaseClick={onShowcaseClick}
        onToySelect={onToySelect}
        selectDraggingRef={selectDraggingRef}
        selectDragging={selectDragging}
        sceneInfoExitToyId={activeSceneInfoExitToyId}
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
