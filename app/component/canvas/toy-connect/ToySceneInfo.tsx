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
  const title = revealed ? toy.name : " ";
  const body = revealed ? toy.description || toy.image : " ";
  const bodyLines = body
    .split(/[,，]/)
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

      const textTargets = infoRef.current.querySelectorAll("h1, p");

      if (!revealed) {
        gsap.set(infoRef.current, { autoAlpha: 0 });
        return;
      }

      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .fromTo(infoRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.46 })
        .fromTo(
          textTargets,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.34, stagger: 0.06 },
          "-=0.28",
        );
    },
    { dependencies: [revealed, title, body], revertOnUpdate: true },
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
          {revealed && <img alt="" aria-hidden="true" src="/%E8%B5%84%E6%BA%90%206.svg" />}
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
