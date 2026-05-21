import { TOY_CONFIG_FILE_NAME } from "~/lib/toy-connect";

type ToyConnectMessageProps = {
  loadState: "loading" | "ready" | "empty" | "error";
};

export function ToyConnectMessage({ loadState }: ToyConnectMessageProps) {
  return (
    <p className="toy-connect__message">
      {loadState === "loading"
        ? "Loading toy..."
        : loadState === "empty"
          ? "No toy with enough points is available."
          : `Unable to load ${TOY_CONFIG_FILE_NAME}.`}
    </p>
  );
}
