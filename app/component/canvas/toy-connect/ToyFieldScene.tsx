import type { ThreeEvent } from "@react-three/fiber";
import type { RefObject } from "react";
import { ToyDisplayItem } from "./ToyDisplayItem";
import type { ToyCanvasMode, ToyLayoutItem } from "./types";

type ToyFieldSceneProps = {
  completedToyIds: Set<string>;
  items: ToyLayoutItem[];
  mode: ToyCanvasMode;
  onShowcaseClick: () => void;
  onToySelect: (toyId: string) => void;
  selectDragging: boolean;
  selectDraggingRef: RefObject<boolean>;
};

export function ToyFieldScene({
  completedToyIds,
  items,
  mode,
  onShowcaseClick,
  onToySelect,
  selectDragging,
  selectDraggingRef,
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
      {mode === "showcase" && (
        <mesh position={[0, 0, -0.1]} onPointerDown={handleStageClick}>
          <planeGeometry args={[18, 12]} />
          <meshBasicMaterial depthWrite={false} transparent opacity={0} />
        </mesh>
      )}
      {items.map((item) => (
        <ToyDisplayItem
          completed={completedToyIds.has(item.toy.id)}
          interactive={mode !== "play"}
          item={item}
          key={item.toy.id}
          variant={mode === "showcase" ? "showcase" : "select"}
          visible={mode !== "play"}
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
    </group>
  );
}
