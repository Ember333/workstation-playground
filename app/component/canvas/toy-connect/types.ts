import type { ImageSize, Toy } from "~/lib/toy-connect";

export type SceneImagePlane = ImageSize & {
  frameSize: number;
  groupLift: number;
  infoGap: number;
  infoDrop: number;
};

export type ScenePoint = [number, number, number];

export type ToyCanvasMode = "showcase" | "select" | "play";

export type ToyLayoutItem = {
  toy: Toy;
  index: number;
  position: ScenePoint;
  scale: number;
};

export type FieldVariant = "showcase" | "select";

export type ViewportBounds = {
  width: number;
  height: number;
};

export type ToyConnectCanvasProps = {
  completedToyIds: Set<string>;
  completionBurstToyId: string | null;
  errorIndex: number | null;
  mode: ToyCanvasMode;
  nextIndex: number;
  onCanvasReady?: () => void;
  onPointClick: (index: number) => void;
  onShowcaseClick: () => void;
  onToySelect: (toyId: string) => void;
  selectedToyId: string | null;
  toys: Toy[];
};

export type ToyConnectSceneProps = {
  animateIn?: boolean;
  completed: boolean;
  completionBurstActive?: boolean;
  detailsVisible?: boolean;
  errorIndex: number | null;
  frameSize?: number;
  interactive: boolean;
  nextIndex: number;
  onPointClick: (index: number) => void;
  onPointSelectIntent?: () => void;
  position?: ScenePoint;
  pointSelectionEnabled?: boolean;
  pointSelectionRadius?: number;
  preloadImage?: boolean;
  scale?: number;
  forceImageReveal?: boolean;
  showConnectionLines?: boolean;
  showImage?: boolean;
  showPlaceholder?: boolean;
  showPoints?: boolean;
  showSceneInfo?: boolean;
  toy: Toy;
  visible?: boolean;
};
