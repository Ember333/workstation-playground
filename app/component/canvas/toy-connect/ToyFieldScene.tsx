import type { ThreeEvent } from "@react-three/fiber";
import { useRef } from "react";
import type { RefObject } from "react";
import type { MeshBasicMaterial } from "three";
import { gsap, useGSAP } from "./animation";
import { SHOWCASE_RING_RADIUS_RATIO } from "./layout";
import { ToyDisplayItem } from "./ToyDisplayItem";
import type { ToyCanvasMode, ToyLayoutItem, ViewportBounds } from "./types";

const ignoreRaycast = () => undefined;

type ToyFieldSceneProps = {
  completedToyIds: Set<string>;
  completionBurstToyId: string | null;
  detailsVisible: boolean;
  errorIndex: number | null;
  items: ToyLayoutItem[];
  mode: ToyCanvasMode;
  nextIndex: number;
  onPointClick: (index: number) => void;
  onShowcaseClick: () => void;
  onToySelect: (toyId: string) => void;
  selectDragging: boolean;
  selectDraggingRef: RefObject<boolean>;
  sceneInfoExitToyId: string | null;
  selectedToyId: string | null;
  viewport: ViewportBounds;
};

export function ToyFieldScene({
  completedToyIds,
  completionBurstToyId,
  detailsVisible,
  errorIndex,
  items,
  mode,
  nextIndex,
  onPointClick,
  onShowcaseClick,
  onToySelect,
  selectDragging,
  selectDraggingRef,
  sceneInfoExitToyId,
  selectedToyId,
  viewport,
}: ToyFieldSceneProps) {
  const ringMaterialRef = useRef<MeshBasicMaterial>(null);

  useGSAP(
    () => {
      if (!ringMaterialRef.current) {
        return;
      }

      gsap.to(ringMaterialRef.current, {
        opacity: mode === "showcase" ? 0.18 : 0,
        duration: 0.48,
        ease: "power2.out",
        overwrite: "auto",
      });
    },
    { dependencies: [mode] },
  );

  function handleStageClick(event: ThreeEvent<PointerEvent>) {
    if (mode !== "showcase") {
      return;
    }

    event.stopPropagation();
    onShowcaseClick();
  }

  return (
    <group>
      <mesh position={[0, 0, -0.08]} raycast={ignoreRaycast}>
        <ringGeometry
          args={[
            Math.min(viewport.width, viewport.height) * SHOWCASE_RING_RADIUS_RATIO - 0.006,
            Math.min(viewport.width, viewport.height) * SHOWCASE_RING_RADIUS_RATIO + 0.006,
            160,
          ]}
        />
        <meshBasicMaterial
          ref={ringMaterialRef}
          color="#050505"
          depthWrite={false}
          transparent
          opacity={mode === "showcase" ? 0.18 : 0}
        />
      </mesh>
      <group>
        {items.map((item) => (
          <ToyDisplayItem
            completed={completedToyIds.has(item.toy.id)}
            completionBurstActive={item.toy.id === completionBurstToyId}
            detailsVisible={detailsVisible}
            errorIndex={errorIndex}
            interactive={mode !== "play"}
            item={item}
            mode={mode}
            nextIndex={nextIndex}
            key={item.toy.id}
            sceneInfoExiting={item.toy.id === sceneInfoExitToyId}
            selected={item.toy.id === selectedToyId}
            variant={mode === "showcase" ? "showcase" : "select"}
            visible
            viewport={viewport}
            onPointClick={onPointClick}
            onSelectIntent={() => {
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
      {mode === "showcase" && (
        <mesh position={[0, 0, -1]} onPointerUp={handleStageClick}>
          <planeGeometry args={[viewport.width * 1.4, viewport.height * 1.4]} />
          <meshBasicMaterial depthWrite={false} transparent opacity={0} />
        </mesh>
      )}
    </group>
  );
}
