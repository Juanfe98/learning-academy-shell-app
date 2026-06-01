import { buildBundle } from "./bundler";
import type { FileMap } from "./file-tree";

interface WorkerRequest {
  id: number;
  fileMap: FileMap;
  entryPath: string;
  environment: "react-js" | "react-ts" | "node-ts";
}

self.addEventListener("message", async (e: MessageEvent<WorkerRequest>) => {
  const { id, fileMap, entryPath, environment } = e.data;
  try {
    const result = await buildBundle(fileMap, entryPath, environment);
    self.postMessage({ id, ...result });
  } catch (err) {
    self.postMessage({
      id,
      bundle: "",
      css: "",
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
