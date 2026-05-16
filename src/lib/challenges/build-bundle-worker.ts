import type { FileMap } from "./file-tree";
import type { BundleResult } from "./bundler";

type Pending = { resolve: (r: BundleResult) => void };

let worker: Worker | null = null;
let reqId = 0;
const pending = new Map<number, Pending>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(
      new URL("./bundler.worker.ts", import.meta.url),
      { type: "module" }
    );
    worker.addEventListener("message", (e: MessageEvent) => {
      const { id, bundle, css, error } = e.data;
      const p = pending.get(id);
      if (!p) return;
      pending.delete(id);
      p.resolve({ bundle, css, error });
    });
    worker.addEventListener("error", () => {
      worker = null;
    });
  }
  return worker;
}

export async function buildBundleInWorker(
  fileMap: FileMap,
  entryPath: string,
  environment: "react-js" | "react-ts" | "node-ts"
): Promise<BundleResult> {
  // SSR / environments without Worker support — fall back to main thread
  if (typeof Worker === "undefined") {
    const { buildBundle } = await import("./bundler");
    return buildBundle(fileMap, entryPath, environment);
  }

  return new Promise((resolve) => {
    const id = reqId++;
    pending.set(id, { resolve });
    try {
      getWorker().postMessage({ id, fileMap, entryPath, environment });
    } catch {
      pending.delete(id);
      // Worker unavailable — fall back to main thread
      import("./bundler")
        .then(({ buildBundle }) => buildBundle(fileMap, entryPath, environment))
        .then(resolve);
    }
  });
}
