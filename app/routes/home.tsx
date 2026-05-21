import { useEffect, useState } from "react";
import { ToyConnectCanvas } from "~/component/canvas/ToyConnectCanvas";
import { HomeDemoInfo } from "~/component/ui/HomeDemoInfo";
import { HomeDemoMessage } from "~/component/ui/HomeDemoMessage";
import type { DemoToy, ToyConfig } from "~/lib/toy-demo";
import { chooseDemoToy, normalizeToy, TOY_CONFIG_URL } from "~/lib/toy-demo";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Toy Connect Demo" }];
}

export default function Home() {
  const [toy, setToy] = useState<DemoToy | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [nextIndex, setNextIndex] = useState(0);
  const [errorIndex, setErrorIndex] = useState<number | null>(null);
  const completed = Boolean(toy && nextIndex >= toy.points.length);

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
          ? value.map((item) => normalizeToy(item as ToyConfig)).filter((item): item is DemoToy => Boolean(item))
          : [];
        const selectedToy = chooseDemoToy(toys);

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
    if (!toy || completed) {
      return;
    }

    if (index !== nextIndex) {
      setErrorIndex(index);
      window.setTimeout(() => setErrorIndex(null), 180);
      return;
    }

    setErrorIndex(null);
    setNextIndex(index + 1);
  }

  return (
    <main className="home-demo">
      <section className="home-demo__stage" aria-label="Toy connection demo">
        {toy && loadState === "ready" ? (
          <ToyConnectCanvas
            completed={completed}
            errorIndex={errorIndex}
            nextIndex={nextIndex}
            onPointClick={handlePointClick}
            toy={toy}
          />
        ) : (
          <HomeDemoMessage loadState={loadState} />
        )}
      </section>

      <HomeDemoInfo completed={completed} nextIndex={nextIndex} toy={toy} />
    </main>
  );
}
