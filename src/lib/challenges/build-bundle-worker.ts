import type { FileMap } from "./file-tree";
import type { BundleResult } from "./bundler";

type Pending = { resolve: (r: BundleResult) => void };

let worker: Worker | null = null;
let reqId = 0;
const pending = new Map<number, Pending>();

function rejectAllPending(reason: string) {
  for (const { resolve } of pending.values()) {
    resolve({ bundle: "", css: "", error: reason });
  }
  pending.clear();
}

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
      p.resolve({ bundle: bundle ?? "", css: css ?? "", error });
    });
    worker.addEventListener("error", () => {
      rejectAllPending("Bundler worker failed to initialize");
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
  // SSR — no Worker available
  if (typeof Worker === "undefined") {
    return { bundle: "", css: "", error: "Bundler worker not available in this environment" };
  }

  return new Promise((resolve) => {
    const id = reqId++;
    pending.set(id, { resolve });
    try {
      getWorker().postMessage({ id, fileMap, entryPath, environment });
    } catch (err) {
      pending.delete(id);
      resolve({
        bundle: "",
        css: "",
        error: err instanceof Error ? err.message : "Failed to send message to bundler worker",
      });
    }
  });
}
