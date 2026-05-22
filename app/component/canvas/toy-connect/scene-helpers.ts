import type { ThreeEvent } from "@react-three/fiber";
import { CONNECTION_LINE_Z, POINTER_LINE_Z } from "./constants";
import type { ScenePoint } from "./types";

export function getCompletionDelay(index: number, count: number) {
  if (count <= 1) {
    return 0;
  }

  const candidateSteps = [11, 9, 7, 5, 3];
  const step =
    candidateSteps.find((candidate) => {
      if (candidate >= count) {
        return false;
      }

      let a = candidate;
      let b = count;
      while (b !== 0) {
        const t = a % b;
        a = b;
        b = t;
      }

      return a === 1;
    }) ?? 1;
  const shuffled = (index * step + 3) % count;

  return shuffled * 0.035;
}

export function getQuestionRotation(seed: string) {
  const hash = Array.from(seed).reduce((value, char) => {
    return (value * 31 + char.charCodeAt(0)) % 1009;
  }, 17);

  return (hash / 1008) * 40 - 20;
}

export function getExplosionDirection(center: ScenePoint, index: number, count: number) {
  const fallbackAngle = ((index * 137.5 + 23) % 360) * (Math.PI / 180);
  const centerDistance = Math.hypot(center[0], center[1]);
  const outwardX = centerDistance > 0.001 ? center[0] / centerDistance : Math.cos(fallbackAngle);
  const outwardY = centerDistance > 0.001 ? center[1] / centerDistance : Math.sin(fallbackAngle);
  const distance = count > 8 ? 0.28 : 0.22;
  const drift = ((index % 3) - 1) * 0.035;

  return {
    x: outwardX * distance - outwardY * drift,
    y: outwardY * distance + outwardX * drift,
    rotation: (index % 2 === 0 ? 1 : -1) * (10 + (index % 5) * 3),
  };
}

export function getLineSegmentCenter(points: [ScenePoint, ScenePoint]): ScenePoint {
  const [[startX, startY], [endX, endY]] = points;

  return [(startX + endX) * 0.5, (startY + endY) * 0.5, CONNECTION_LINE_Z];
}

export function getLocalPointerPoint(event: ThreeEvent<PointerEvent>, z = POINTER_LINE_Z): ScenePoint {
  const localPoint = event.object.worldToLocal(event.point.clone());

  return [localPoint.x, localPoint.y, z];
}
