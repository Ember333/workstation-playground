import type { DemoToy } from "~/lib/toy-demo";

type HomeDemoInfoProps = {
  completed: boolean;
  nextIndex: number;
  toy: DemoToy | null;
};

export function HomeDemoInfo({ completed, nextIndex, toy }: HomeDemoInfoProps) {
  return (
    <section className="home-demo__info" aria-live="polite">
      {toy && completed ? (
        <>
          <h1>{toy.name}</h1>
          <p>{toy.description || toy.image}</p>
        </>
      ) : (
        <>
          <h1>{toy ? `${nextIndex}/${toy.points.length}` : "Toy Connect"}</h1>
          <p>Tap the black dots in order.</p>
        </>
      )}
    </section>
  );
}
