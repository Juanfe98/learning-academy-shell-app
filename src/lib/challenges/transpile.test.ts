import { describe, it, expect } from "vitest";
import { stripHostImports } from "./transpile";

describe("stripHostImports", () => {
  it("strips bare import React lines", () => {
    const input = `import React from "react";\nfunction App() { return null; }`;
    expect(stripHostImports(input)).not.toContain("import React");
    expect(stripHostImports(input)).toContain("function App");
  });

  it("strips import ReactDOM lines", () => {
    const input = `import ReactDOM from "react-dom";\nconst x = 1;`;
    expect(stripHostImports(input)).not.toContain("import ReactDOM");
    expect(stripHostImports(input)).toContain("const x = 1");
  });

  it("leaves unrelated imports intact", () => {
    const input = `import { useState } from "react";\nfunction App() {}`;
    expect(stripHostImports(input)).toContain(`import { useState } from "react"`);
  });

  it("handles empty string", () => {
    expect(stripHostImports("")).toBe("");
  });
});
