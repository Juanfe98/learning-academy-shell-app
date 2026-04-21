import type * as BabelStandalone from "@babel/standalone";

declare const Babel: typeof BabelStandalone;

self.onmessage = (event: MessageEvent) => {
  const { id, code } = event.data as { id: string; code: string };

  try {
    const result = Babel.transform(code, {
      presets: ["react", ["env", { targets: { browsers: "last 2 versions" }, modules: false }]],
      filename: "challenge.jsx",
    });

    self.postMessage({ id, transpiled: result.code, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({ id, transpiled: null, error: message });
  }
};

export {};
