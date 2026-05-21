import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

type CanvasReadySignalProps = {
  onReady?: () => void;
};

export function CanvasReadySignal({ onReady }: CanvasReadySignalProps) {
  const calledRef = useRef(false);

  useFrame(() => {
    if (calledRef.current) {
      return;
    }

    calledRef.current = true;
    onReady?.();
  });

  return null;
}
