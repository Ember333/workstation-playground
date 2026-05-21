import { useEffect, useState } from "react";
import { ToyConnectCanvas } from "~/component/canvas/ToyConnectCanvas";
import { ToyConnectMessage } from "~/component/ui/ToyConnectMessage";
import type { Toy, ToyConfig } from "~/lib/toy-connect";
import { chooseToy, normalizeToy, TOY_CONFIG_URL } from "~/lib/toy-connect";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [{ title: "工位游乐场" }];
}

export default function Home() {
  const [toy, setToy] = useState<Toy | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [nextIndex, setNextIndex] = useState(0);
  const [errorIndex, setErrorIndex] = useState<number | null>(null);
  const completed = Boolean(toy && nextIndex > toy.points.length);

  useEffect(() => {
    let cancelled = false;

    async function loadToyConfig() {
      try {
        const response = await fetch(TOY_CONFIG_URL);

        if (!response.ok) {
          throw new Error("Failed to load toy config");
        }

        const value = (await response.json()) as unknown;
        const toys = Array.isArray(value)
          ? value.map((item) => normalizeToy(item as ToyConfig)).filter((item): item is Toy => Boolean(item))
          : [];
        const selectedToy = chooseToy(toys);

        if (cancelled) {
          return;
        }

        setToy(selectedToy);
        setLoadState(selectedToy ? "ready" : "empty");
      } catch {
        if (!cancelled) {
          setLoadState("error");
        }
      }
    }

    loadToyConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  function handlePointClick(index: number) {
    if (!toy) {
      return;
    }

    setNextIndex((currentNextIndex) => {
      const pointCount = toy.points.length;

      if (currentNextIndex > pointCount) {
        return currentNextIndex;
      }

      if (currentNextIndex === pointCount) {
        if (index !== 0) {
          setErrorIndex(index);
          window.setTimeout(() => setErrorIndex(null), 180);
          return currentNextIndex;
        }

        setErrorIndex(null);
        return currentNextIndex + 1;
      }

      if (index < currentNextIndex) {
        return currentNextIndex;
      }

      if (index !== currentNextIndex) {
        setErrorIndex(index);
        window.setTimeout(() => setErrorIndex(null), 180);
        return currentNextIndex;
      }

      setErrorIndex(null);
      return currentNextIndex + 1;
    });
  }

  return (
    <main className="toy-connect">
      <section className="toy-connect__stage" aria-label="Toy connection">
        {toy && loadState === "ready" ? (
          <ToyConnectCanvas
            completed={completed}
            errorIndex={errorIndex}
            nextIndex={nextIndex}
            onPointClick={handlePointClick}
            toy={toy}
          />
        ) : (
          <ToyConnectMessage loadState={loadState} />
        )}
      </section>
    </main>
  );
}
