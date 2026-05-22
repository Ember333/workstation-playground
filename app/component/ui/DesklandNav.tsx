import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

type DesklandNavProps = {
  completedCount: number;
  mode: "showcase" | "select" | "play";
  onClose: () => void;
  onHome: () => void;
  totalCount: number;
};

export function DesklandNav({ completedCount, mode, onClose, onHome, totalCount }: DesklandNavProps) {
  const brandInteractive = mode !== "play";
  const closeRef = useRef<HTMLButtonElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const initialRenderRef = useRef(true);

  useGSAP(
    () => {
      const close = closeRef.current;
      const progress = progressRef.current;

      if (!close || !progress) {
        return;
      }

      const closeVisible = mode === "play";
      const targets = [close, progress];

      gsap.killTweensOf(targets);

      if (initialRenderRef.current) {
        initialRenderRef.current = false;
        gsap.set(close, { autoAlpha: closeVisible ? 1 : 0 });
        gsap.set(progress, { autoAlpha: closeVisible ? 0 : 1 });
        return;
      }

      const outgoing = closeVisible ? progress : close;
      const incoming = closeVisible ? close : progress;

      gsap
        .timeline()
        .to(outgoing, {
          autoAlpha: 0,
          duration: 0.48,
          ease: "power2.out",
        })
        .to(incoming, {
          autoAlpha: 1,
          duration: 0.56,
          ease: "power2.out",
        });
    },
    { dependencies: [mode] },
  );

  return (
    <nav className="deskland-nav" aria-label="DESKLAND">
      <button
        className="deskland-nav__brand"
        type="button"
        aria-disabled={!brandInteractive}
        aria-label="DESKLAND home"
        tabIndex={brandInteractive ? 0 : -1}
        onClick={brandInteractive ? onHome : undefined}
      >
        <img src="/deskland-wordmark.svg" alt="DESKLAND" />
      </button>
      <span className="deskland-nav__action">
        <button
          ref={closeRef}
          className="deskland-nav__close"
          type="button"
          aria-label="Close toy"
          aria-hidden={mode !== "play"}
          disabled={mode !== "play"}
          onClick={onClose}
        >
          <img src="/deskland-close.svg" alt="" aria-hidden="true" />
        </button>
        <span
          ref={progressRef}
          className="deskland-nav__progress"
          aria-hidden={mode === "play"}
          aria-label={`${completedCount} of ${totalCount} toys completed`}
        >
          {completedCount}/{totalCount}
        </span>
      </span>
    </nav>
  );
}
