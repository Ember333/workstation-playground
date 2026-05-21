import { ToyExperienceLoader } from "~/component/toy-experience/ToyExperienceLoader";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [{ title: "工位游乐场" }];
}

export default function Home() {
  return (
    <main className="toy-connect">
      <ToyExperienceLoader />
    </main>
  );
}
