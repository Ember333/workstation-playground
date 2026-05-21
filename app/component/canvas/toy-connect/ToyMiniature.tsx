import { Line, useTexture } from "@react-three/drei";
import { SRGBColorSpace } from "three";
import type { Toy } from "~/lib/toy-connect";
import { getContainedImageSize, getScenePoint, getToyImageSrc } from "~/lib/toy-connect";
import { POINT_CONTACT_RADIUS } from "./constants";
import { PLAY_FRAME_SIZE } from "./layout";
import type { ScenePoint } from "./types";

type ToyMiniatureProps = {
  completed: boolean;
  scale: number;
  toy: Toy;
};

export function ToyMiniature({ completed, scale, toy }: ToyMiniatureProps) {
  const texture = useTexture(getToyImageSrc(toy.image));
  const imageElement = texture.image as HTMLImageElement | undefined;
  const imagePlane = getContainedImageSize(
    {
      width: imageElement?.naturalWidth || imageElement?.width || 1,
      height: imageElement?.naturalHeight || imageElement?.height || 1,
    },
    scale,
  );
  const points = toy.points.map((point) => {
    const [x, y] = getScenePoint(point, imagePlane);

    return [x, y, 0.02] as ScenePoint;
  });
  const closedPoints = points.length > 1 ? [...points, points[0]] : points;
  const pointRadius = POINT_CONTACT_RADIUS * (scale / PLAY_FRAME_SIZE);

  if (texture.colorSpace !== SRGBColorSpace) {
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
  }

  return (
    <group>
      {completed && (
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[imagePlane.width, imagePlane.height]} />
          <meshBasicMaterial depthWrite={false} map={texture} toneMapped={false} transparent opacity={0.92} />
        </mesh>
      )}
      {closedPoints.length > 1 && (
        <Line
          points={closedPoints}
          color="#050505"
          depthWrite={false}
          lineWidth={1.1}
          renderOrder={1}
          transparent
          opacity={completed ? 0.62 : 0.78}
        />
      )}
      {points.map((position, index) => (
        <mesh key={`${toy.id}-mini-point-${index}`} position={position} renderOrder={2}>
          <circleGeometry args={[pointRadius, 18]} />
          <meshBasicMaterial color="#050505" depthWrite={false} transparent opacity={completed ? 0.78 : 1} />
        </mesh>
      ))}
    </group>
  );
}
