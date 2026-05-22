import { Suspense, useEffect, useRef } from "react";
import { Html, useTexture } from "@react-three/drei";
import { SRGBColorSpace } from "three";
import type { Group, MeshBasicMaterial } from "three";
import type { CSSProperties } from "react";
import type { ImageSize } from "~/lib/toy-connect";
import { gsap, useGSAP } from "./animation";
import { ToyQuestionMark } from "./ToyQuestionMark";
import type { SceneImagePlane } from "./types";

const QUESTION_MARK_MIN_SCALE = 0.18;
const QUESTION_MARK_SCALE_RATIO = 0.1;
const htmlOverlayStyle = { pointerEvents: "none" } satisfies CSSProperties;

type ImagePlaneProps = {
  questionRotation: number;
  revealed: boolean;
  imagePlane: SceneImagePlane;
  onImageSize: (size: ImageSize) => void;
  preloadImage?: boolean;
  showPlaceholder?: boolean;
  src: string;
};

type RevealedImageProps = {
  imagePlane: SceneImagePlane;
  onImageSize: (size: ImageSize) => void;
  revealed: boolean;
  src: string;
};

function RevealedImage({ imagePlane, onImageSize, revealed, src }: RevealedImageProps) {
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

      if (!revealed) {
        gsap.set(imageGroupRef.current.scale, { x: 1, y: 1, z: 1 });
        gsap.set(materialRef.current, { opacity: 0 });
        return;
      }

      gsap.to(imageGroupRef.current.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.76,
        ease: "power2.out",
        overwrite: "auto",
      });
      gsap.to(materialRef.current, {
        opacity: 1,
        duration: 0.76,
        ease: "power2.out",
        overwrite: "auto",
      });
    },
    { dependencies: [revealed, src] },
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
  preloadImage = false,
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
      {(revealed || preloadImage) && (
        <Suspense fallback={null}>
          <RevealedImage imagePlane={imagePlane} onImageSize={onImageSize} revealed={revealed} src={src} />
        </Suspense>
      )}
      {showPlaceholder && (
        <Html
          center
          transform
          position={[0, 0, 0.04]}
          scale={Math.max(QUESTION_MARK_MIN_SCALE, imagePlane.frameSize * QUESTION_MARK_SCALE_RATIO)}
          style={htmlOverlayStyle}
          zIndexRange={[120, 0]}
        >
          <ToyQuestionMark revealed={revealed} rotation={questionRotation} />
        </Html>
      )}
    </group>
  );
}
