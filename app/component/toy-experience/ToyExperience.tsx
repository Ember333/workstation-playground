import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { DesklandNav } from "~/component/ui/DesklandNav";
import { ToyLoadingLogo } from "~/component/ui/ToyLoadingLogo";
import type { Toy } from "~/lib/toy-connect";
import type { ToyCanvasMode } from "~/component/canvas/toy-connect/types";
import { LazyToyConnectCanvas } from "./toy-canvas-loader";

const COMPLETED_STORAGE_KEY = "toy-connect:completed-toy-ids";

type ToyExperienceProps = {
  onCanvasReady: () => void;
  toys: Toy[];
};

function getStoredCompletedToyIds(toys: Toy[]) {
  if (typeof window === "undefined") {
    return new Set<string>();
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(COMPLETED_STORAGE_KEY) ?? "[]") as unknown;
    const completedAliases = new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []);
    const completedToyIds = toys
      .filter((toy) => [toy.id, toy.image, toy.configId].some((alias) => alias && completedAliases.has(alias)))
      .map((toy) => toy.id);

    return new Set(completedToyIds);
  } catch {
    return new Set<string>();
  }
}

function persistCompletedToyIds(completedToyIds: Set<string>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(Array.from(completedToyIds)));
}

export function ToyExperience({ onCanvasReady, toys }: ToyExperienceProps) {
  const [mode, setMode] = useState<ToyCanvasMode>("showcase");
  const [selectedToyId, setSelectedToyId] = useState<string | null>(null);
  const [completedToyIds, setCompletedToyIds] = useState(() => getStoredCompletedToyIds(toys));
  const [completionBurstToyId, setCompletionBurstToyId] = useState<string | null>(null);
  const [nextIndexByToyId, setNextIndexByToyId] = useState<Record<string, number>>({});
  const [errorIndex, setErrorIndex] = useState<number | null>(null);
  const completionBurstTimeoutRef = useRef<number | null>(null);
  const selectedToy = toys.find((toy) => toy.id === selectedToyId) ?? null;
  const nextIndex = selectedToy ? (completedToyIds.has(selectedToy.id) ? selectedToy.points.length + 1 : nextIndexByToyId[selectedToy.id] ?? 0) : 0;
  const completedCount = useMemo(
    () => toys.filter((toy) => completedToyIds.has(toy.id)).length,
    [completedToyIds, toys],
  );

  useEffect(() => {
    persistCompletedToyIds(completedToyIds);
  }, [completedToyIds]);

  useEffect(() => {
    return () => {
      if (completionBurstTimeoutRef.current !== null) {
        window.clearTimeout(completionBurstTimeoutRef.current);
      }
    };
  }, []);

  function markToyCompleted(toyId: string) {
    setCompletedToyIds((current) => {
      if (current.has(toyId)) {
        return current;
      }

      const next = new Set(current);
      next.add(toyId);
      setCompletionBurstToyId(toyId);

      if (completionBurstTimeoutRef.current !== null) {
        window.clearTimeout(completionBurstTimeoutRef.current);
      }

      completionBurstTimeoutRef.current = window.setTimeout(() => {
        setCompletionBurstToyId((currentToyId) => (currentToyId === toyId ? null : currentToyId));
        completionBurstTimeoutRef.current = null;
      }, 1200);

      return next;
    });
  }

  function showShowcase() {
    setMode("showcase");
    setSelectedToyId(null);
    setErrorIndex(null);
  }

  function showSelect() {
    setMode("select");
    setSelectedToyId(null);
    setErrorIndex(null);
  }

  function selectToy(toyId: string) {
    setSelectedToyId(toyId);
    setErrorIndex(null);
    setMode("play");
  }

  function handlePointClick(index: number) {
    if (!selectedToy) {
      return;
    }

    setNextIndexByToyId((currentByToyId) => {
      const pointCount = selectedToy.points.length;
      const currentNextIndex = currentByToyId[selectedToy.id] ?? 0;

      if (currentNextIndex > pointCount) {
        return currentByToyId;
      }

      if (currentNextIndex === pointCount) {
        if (index !== 0) {
          setErrorIndex(index);
          window.setTimeout(() => setErrorIndex(null), 180);
          return currentByToyId;
        }

        setErrorIndex(null);
        markToyCompleted(selectedToy.id);
        return { ...currentByToyId, [selectedToy.id]: currentNextIndex + 1 };
      }

      if (index < currentNextIndex) {
        return currentByToyId;
      }

      if (index !== currentNextIndex) {
        setErrorIndex(index);
        window.setTimeout(() => setErrorIndex(null), 180);
        return currentByToyId;
      }

      setErrorIndex(null);
      return { ...currentByToyId, [selectedToy.id]: currentNextIndex + 1 };
    });
  }

  return (
    <>
      <DesklandNav
        completedCount={completedCount}
        mode={mode}
        totalCount={toys.length}
        onClose={showSelect}
        onHome={mode === "showcase" ? showSelect : showShowcase}
      />
      <section
        className="toy-connect__stage"
        aria-label="Toy connection"
        data-mode={mode}
        data-selected-toy-id={selectedToyId ?? undefined}
      >
        <Suspense fallback={<ToyLoadingLogo />}>
          <LazyToyConnectCanvas
            completedToyIds={completedToyIds}
            completionBurstToyId={completionBurstToyId}
            errorIndex={errorIndex}
            mode={mode}
            nextIndex={nextIndex}
            selectedToyId={selectedToyId}
            toys={toys}
            onCanvasReady={onCanvasReady}
            onPointClick={handlePointClick}
            onShowcaseClick={showSelect}
            onToySelect={selectToy}
          />
        </Suspense>
      </section>
    </>
  );
}
