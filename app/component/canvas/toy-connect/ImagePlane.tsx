import { Suspense, useEffect, useRef } from "react";
import { Html, useTexture } from "@react-three/drei";
import { SRGBColorSpace } from "three";
import type { Group, MeshBasicMaterial } from "three";
import type { ImageSize } from "~/lib/toy-connect";
import { gsap, useGSAP } from "./animation";
import { ToyQuestionMark } from "./ToyQuestionMark";
import type { SceneImagePlane } from "./types";

type ImagePlaneProps = {
  questionRotation: number;
  revealed: boolean;
  imagePlane: SceneImagePlane;
  onImageSize: (size: ImageSize) => void;
  showPlaceholder?: boolean;
  src: string;
};

type RevealedImageProps = {
  imagePlane: SceneImagePlane;
  onImageSize: (size: ImageSize) => void;
  src: string;
};

function RevealedImage({ imagePlane, onImageSize, src }: RevealedImageProps) {
  const texture = useTexture(src);
  const imageGroupRef = useRef<Group>(null);
  const materialRef = useRef<MeshBasicMaterial>(null);

  if (texture.colorSpace !== SRGBColorSpace) {
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
  }

  useEffect(() => {
    const image = texture.image as HTMLImageElement | undefined;

    onImageSize({
      width: image?.naturalWidth || image?.width || 1,
      height: image?.naturalHeight || image?.height || 1,
    });
  }, [onImageSize, texture]);

  useGSAP(
    () => {
      if (!imageGroupRef.current || !materialRef.current) {
        return;
      }

      gsap
        .timeline()
        .fromTo(
          imageGroupRef.current.scale,
          { x: 0.7, y: 0.7, z: 1 },
          { x: 1.2, y: 1.2, z: 1, duration: 0.78, ease: "elastic.out(1, 0.45)" },
          0,
        )
        .fromTo(
          materialRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.42, ease: "power2.out" },
          0,
        );
    },
    { dependencies: [src], revertOnUpdate: true },
  );

  return (
    <group ref={imageGroupRef}>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[imagePlane.width, imagePlane.height]} />
        <meshBasicMaterial
          ref={materialRef}
          depthWrite={false}
          map={texture}
          toneMapped={false}
          transparent
          opacity={0}
        />
      </mesh>
    </group>
  );
}

export function ImagePlane({
  questionRotation,
  revealed,
  imagePlane,
  onImageSize,
  showPlaceholder = true,
  src,
}: ImagePlaneProps) {
  useEffect(() => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      onImageSize({
        width: image.naturalWidth || image.width || 1,
        height: image.naturalHeight || image.height || 1,
      });
    };
    image.src = src;

    return () => {
      image.onload = null;
    };
  }, [onImageSize, src]);

  return (
    <group>
      <mesh>
        <planeGeometry args={[imagePlane.frameSize, imagePlane.frameSize]} />
        <meshBasicMaterial color="#ffffff" depthWrite={false} transparent opacity={0} />
      </mesh>
      {revealed && (
        <Suspense fallback={null}>
          <RevealedImage imagePlane={imagePlane} onImageSize={onImageSize} src={src} />
        </Suspense>
      )}
      {showPlaceholder && (
        <Html
          center
          transform
          position={[0, 0, 0.04]}
          scale={Math.max(0.14, imagePlane.frameSize * 0.08)}
          style={{ pointerEvents: "none" }}
          zIndexRange={[120, 0]}
        >
          <ToyQuestionMark revealed={revealed} rotation={questionRotation} />
        </Html>
      )}
    </group>
  );
}
