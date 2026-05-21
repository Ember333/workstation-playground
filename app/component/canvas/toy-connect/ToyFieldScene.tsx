import type { ThreeEvent } from "@react-three/fiber";
import type { RefObject } from "react";
import { ToyDisplayItem } from "./ToyDisplayItem";
import type { ToyCanvasMode, ToyLayoutItem, ViewportBounds } from "./types";

type ToyFieldSceneProps = {
  completedToyIds: Set<string>;
  errorIndex: number | null;
  items: ToyLayoutItem[];
  mode: ToyCanvasMode;
  nextIndex: number;
  onPointClick: (index: number) => void;
  onShowcaseClick: () => void;
  onToySelect: (toyId: string) => void;
  selectDragging: boolean;
  selectDraggingRef: RefObject<boolean>;
  selectedToyId: string | null;
  viewport: ViewportBounds;
};

export function ToyFieldScene({
  completedToyIds,
  errorIndex,
  items,
  mode,
  nextIndex,
  onPointClick,
  onShowcaseClick,
  onToySelect,
  selectDragging,
  selectDraggingRef,
  selectedToyId,
  viewport,
}: ToyFieldSceneProps) {
  function handleStageClick(event: ThreeEvent<PointerEvent>) {
    if (mode !== "showcase") {
      return;
    }

    event.stopPropagation();
    onShowcaseClick();
  }

  return (
    <group>
      {items.map((item) => (
        <ToyDisplayItem
          completed={completedToyIds.has(item.toy.id)}
          errorIndex={errorIndex}
          interactive={mode !== "play"}
          item={item}
          mode={mode}
          nextIndex={nextIndex}
          key={item.toy.id}
          selected={item.toy.id === selectedToyId}
          variant={mode === "showcase" ? "showcase" : "select"}
          visible={mode !== "play" || item.toy.id === selectedToyId}
          onPointClick={onPointClick}
          onClick={(event) => {
            event.stopPropagation();

            if (mode === "showcase") {
              onShowcaseClick();
              return;
            }

            if (mode === "select" && !selectDragging && !selectDraggingRef.current) {
              onToySelect(item.toy.id);
            }
          }}
        />
      ))}
      {mode === "showcase" && (
        <mesh position={[0, 0, -0.2]} onPointerDown={handleStageClick}>
          <planeGeometry args={[viewport.width * 1.4, viewport.height * 1.4]} />
          <meshBasicMaterial depthWrite={false} transparent opacity={0} />
        </mesh>
      )}
    </group>
  );
}
