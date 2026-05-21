import { useEffect, useState } from "react";
import { ToyConnectMessage } from "~/component/ui/ToyConnectMessage";
import { ToyLoadingLogo } from "~/component/ui/ToyLoadingLogo";
import type { Toy } from "~/lib/toy-connect";
import { loadToyCanvasModule } from "./toy-canvas-loader";
import { loadToyConfig, preloadToyAssets } from "./toy-preload";
import { ToyExperience } from "./ToyExperience";

type LoadState = "loading" | "ready" | "empty" | "error";

export function ToyExperienceLoader() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [toys, setToys] = useState<Toy[]>([]);
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function prepareExperience() {
      try {
        const loadedToys = await loadToyConfig();

        if (loadedToys.length === 0) {
          if (!cancelled) {
            setLoadState("empty");
          }
          return;
        }

        await Promise.all([preloadToyAssets(loadedToys), loadToyCanvasModule()]);

        if (!cancelled) {
          setToys(loadedToys);
          setLoadState("ready");
        }
      } catch {
        if (!cancelled) {
          setLoadState("error");
        }
      }
    }

    prepareExperience();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loadState === "empty" || loadState === "error") {
    return (
      <section className="toy-connect__stage" aria-label="Toy connection">
        <ToyConnectMessage loadState={loadState} />
      </section>
    );
  }

  return (
    <>
      {loadState === "ready" && <ToyExperience toys={toys} onCanvasReady={() => setCanvasReady(true)} />}
      {(loadState === "loading" || !canvasReady) && <ToyLoadingLogo />}
    </>
  );
}
