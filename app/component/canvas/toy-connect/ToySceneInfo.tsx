import { useRef } from "react";
import { Html } from "@react-three/drei";
import type { Toy } from "~/lib/toy-connect";
import { gsap, useGSAP } from "./animation";
import type { SceneImagePlane } from "./types";

type ToySceneInfoProps = {
  revealed: boolean;
  imagePlane: SceneImagePlane;
  toy: Toy;
};

export function ToySceneInfo({ revealed, imagePlane, toy }: ToySceneInfoProps) {
  const infoRef = useRef<HTMLDivElement>(null);
  const hasRevealedRef = useRef(false);
  const lastTitleRef = useRef(" ");
  const lastBodyRef = useRef(" ");

  if (revealed) {
    lastTitleRef.current = toy.name;
    lastBodyRef.current = toy.description || toy.image;
  }

  const hasContent = revealed || hasRevealedRef.current;
  const title = hasContent ? lastTitleRef.current : " ";
  const body = hasContent ? lastBodyRef.current : " ";
  const bodyLines = body
    .replace(/[,，]\s*/g, " ")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const position = [0, imagePlane.height * -0.5 - imagePlane.infoGap - imagePlane.infoDrop, 0.16] as [
    number,
    number,
    number,
  ];

  useGSAP(
    () => {
      if (!infoRef.current) {
        return;
      }

      if (!revealed) {
        if (!hasRevealedRef.current) {
          gsap.set(infoRef.current, { autoAlpha: 0 });
          return;
        }

        gsap.to(infoRef.current, {
          autoAlpha: 0,
          duration: 0.44,
          ease: "power2.out",
          overwrite: "auto",
        });
        return;
      }

      hasRevealedRef.current = true;
      gsap.fromTo(infoRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.92, ease: "power2.out" });
    },
    { dependencies: [revealed, title, body] },
  );

  return (
    <Html
      center
      position={position}
      style={{ pointerEvents: "none" }}
      zIndexRange={[100, 0]}
    >
      <div className="toy-connect__scene-info" aria-live="polite" ref={infoRef}>
        <h1>
          <span>{title}</span>
          {hasContent && <img alt="" aria-hidden="true" src="/%E8%B5%84%E6%BA%90%206.svg" />}
        </h1>
        <p>
          {bodyLines.map((line, index) => (
            <span key={`${line}-${index}`}>{line}</span>
          ))}
        </p>
      </div>
    </Html>
  );
}
