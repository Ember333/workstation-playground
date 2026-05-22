import { ToyConfigEditor } from "~/component/toy-config/ToyConfigEditor";
import type { Route } from "./+types/config";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Toy Config Editor" }];
}

export default function Config() {
  return <ToyConfigEditor />;
}
