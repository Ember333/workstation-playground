import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { installThreeConsoleFilter } from "~/lib/three-console";
import { CanvasReadySignal } from "./toy-connect/CanvasReadySignal";
import { clampSelectScroll, FIELD_CAMERA_ZOOM, getFieldViewport, getToyLayoutItems } from "./toy-connect/layout";
import { ToyCameraRig } from "./toy-connect/ToyCameraRig";
import { ToyConnectScene } from "./toy-connect/ToyConnectScene";
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
  const selectDraggingRef = useRef(false);
  const size = useThree((state) => state.size);
  const viewport = useMemo(() => getFieldViewport(size), [size]);
  const layoutMode = mode === "showcase" ? "showcase" : "select";
  const items = useMemo(
    () => getToyLayoutItems(toys, layoutMode, selectScroll, viewport),
    [layoutMode, selectScroll, toys, viewport],
  );
  const selectedItem = items.find((item) => item.toy.id === selectedToyId);

  useEffect(() => {
    setSelectScroll((current) => clampSelectScroll(current, toys.length, viewport));
  }, [toys.length, viewport]);

  return (
    <>
      <color attach="background" args={["#ffffff"]} />
      <ToyCameraRig items={items} mode={mode} selectedToyId={selectedToyId} />
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
        items={items}
        mode={mode}
        onShowcaseClick={onShowcaseClick}
        onToySelect={onToySelect}
        selectDraggingRef={selectDraggingRef}
        selectDragging={selectDragging}
      />
      {mode === "play" && selectedItem && (
        <ToyConnectScene
          animateIn
          completed={completedToyIds.has(selectedItem.toy.id) || nextIndex > selectedItem.toy.points.length}
          errorIndex={errorIndex}
          interactive
          nextIndex={nextIndex}
          position={selectedItem.position}
          scale={1}
          toy={selectedItem.toy}
          onPointClick={onPointClick}
        />
      )}
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
