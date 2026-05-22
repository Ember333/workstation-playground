import { useRef } from "react";
import { gsap, useGSAP } from "./animation";

type ToyQuestionMarkProps = {
  rotation: number;
  visible: boolean;
};

export function ToyQuestionMark({ rotation, visible }: ToyQuestionMarkProps) {
  const questionRef = useRef<HTMLSpanElement>(null);
  const hasMountedRef = useRef(false);

  useGSAP(
    () => {
      if (!questionRef.current) {
        return;
      }

      const target = {
        autoAlpha: visible ? 1 : 0,
        rotation,
        scale: 1,
      };

      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        gsap.set(questionRef.current, target);
        return;
      }

      gsap.to(questionRef.current, {
        ...target,
        duration: visible ? 0.52 : 0.44,
        ease: visible ? "power2.out" : "power2.inOut",
        overwrite: "auto",
      });
    },
    { dependencies: [visible, rotation] },
  );

  return (
    <span className="toy-connect__image-question" ref={questionRef} style={{ opacity: 0, visibility: "hidden" }}>
      <span className="toy-connect__image-question-glyph">?</span>
    </span>
  );
}
