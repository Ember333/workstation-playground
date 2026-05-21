type HomeDemoMessageProps = {
  loadState: "loading" | "ready" | "empty" | "error";
};

export function HomeDemoMessage({ loadState }: HomeDemoMessageProps) {
  return (
    <p className="home-demo__message">
      {loadState === "loading"
        ? "Loading toy..."
        : loadState === "empty"
          ? "No toy with enough points is available."
          : "Unable to load toy-configs.json."}
    </p>
  );
}
