import { getConsoleFunction, setConsoleFunction } from "three";

const CLOCK_DEPRECATION_WARNING =
  "THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.";

type ThreeConsoleMethod = "log" | "warn" | "error";
type ThreeConsoleFunction = (
  type: ThreeConsoleMethod,
  message: string,
  ...params: unknown[]
) => void;

const globalState = globalThis as typeof globalThis & {
  __workstationPlaygroundThreeConsolePatched?: boolean;
};

export function installThreeConsoleFilter() {
  if (globalState.__workstationPlaygroundThreeConsolePatched) {
    return;
  }

  const previousConsoleFunction = getConsoleFunction() as ThreeConsoleFunction | null;

  setConsoleFunction((type, message, ...params) => {
    if (type === "warn" && message === CLOCK_DEPRECATION_WARNING) {
      return;
    }

    if (previousConsoleFunction) {
      previousConsoleFunction(type, message, ...params);
      return;
    }

    console[type](message, ...params);
  });

  globalState.__workstationPlaygroundThreeConsolePatched = true;
}
