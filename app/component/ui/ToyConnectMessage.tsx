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
          : "Unable to load toy-configs.json."}
    </p>
  );
}
