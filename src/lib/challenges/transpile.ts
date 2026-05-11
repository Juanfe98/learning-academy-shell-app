export interface TranspileResult {
  code: string;
  error?: string;
}

export async function transpileJSX(source: string): Promise<TranspileResult> {
  try {
    const Babel = await import("@babel/standalone");
    const result = Babel.transform(source, {
      presets: [
        "react",
        ["env", { targets: { browsers: "last 2 versions" }, modules: "umd" }],
      ],
      filename: "challenge.jsx",
    });
    if (!result.code) throw new Error("Babel produced no output");
    return { code: result.code };
  } catch (err) {
    return { code: "", error: err instanceof Error ? err.message : String(err) };
  }
}

export function stripHostImports(code: string): string {
  return code
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      return !(
        t.startsWith("import React") ||
        t.startsWith("import ReactDOM") ||
        t.startsWith('import "react"') ||
        t.startsWith("import 'react'")
      );
    })
    .join("\n");
}
