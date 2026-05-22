import { useRef } from "react";
import { gsap, useGSAP } from "./animation";

type ToyQuestionMarkProps = {
  revealed: boolean;
  rotation: number;
};

export function ToyQuestionMark({ revealed, rotation }: ToyQuestionMarkProps) {
  const questionRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (!questionRef.current) {
        return;
      }

      if (revealed) {
        gsap.to(questionRef.current, {
          autoAlpha: 0,
          duration: 0.36,
          ease: "power2.out",
          overwrite: "auto",
        });
        return;
      }

      gsap.set(questionRef.current, {
        autoAlpha: 1,
        rotation,
        scale: 1,
      });
    },
    { dependencies: [revealed, rotation], revertOnUpdate: true },
  );

  return (
    <span className="toy-connect__image-question" ref={questionRef}>
      <span className="toy-connect__image-question-glyph">?</span>
    </span>
  );
}
