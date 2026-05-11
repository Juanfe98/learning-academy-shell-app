import { describe, it, expect } from "vitest";
import { buildTree, validateFileName, normalizePath } from "./file-tree";
import type { FileMap } from "./file-tree";

const MAP: FileMap = {
  "./App.jsx": { content: "", language: "jsx", seed: true },
  "./styles.css": { content: "", language: "css", seed: true },
  "./components/Button.jsx": { content: "", language: "jsx", seed: false },
};

describe("buildTree", () => {
  it("produces folder node for implicit folder from file paths", () => {
    const tree = buildTree(MAP, []);
    const folder = tree.find((n) => n.kind === "folder" && n.name === "components");
    expect(folder).toBeDefined();
    if (folder?.kind === "folder") {
      expect(folder.children.some((c) => c.name === "Button.jsx")).toBe(true);
    }
  });

  it("puts root files at top level", () => {
    const tree = buildTree(MAP, []);
    const names = tree.map((n) => n.name);
    expect(names).toContain("App.jsx");
    expect(names).toContain("styles.css");
  });

  it("folders sort before files", () => {
    const tree = buildTree(MAP, []);
    const kinds = tree.map((n) => n.kind);
    expect(kinds[0]).toBe("folder");
  });

  it("includes explicit empty folder from folders list", () => {
    const tree = buildTree({ "./App.jsx": { content: "", language: "jsx", seed: true } }, ["./utils"]);
    const folder = tree.find((n) => n.kind === "folder" && n.name === "utils");
    expect(folder).toBeDefined();
  });
});

describe("validateFileName", () => {
  it("returns null for valid unique name", () => {
    expect(validateFileName("Button.jsx", ["App.jsx"])).toBeNull();
  });

  it("rejects empty name", () => {
    expect(validateFileName("", [])).not.toBeNull();
  });

  it("rejects name with spaces", () => {
    expect(validateFileName("my file.jsx", [])).not.toBeNull();
  });

  it("rejects duplicate (case-insensitive)", () => {
    expect(validateFileName("app.jsx", ["App.jsx"])).not.toBeNull();
  });

  it("rejects name with slash", () => {
    expect(validateFileName("a/b.jsx", [])).not.toBeNull();
  });
});

describe("normalizePath", () => {
  it("resolves ./Button from root App.jsx to ./Button candidates", () => {
    const candidates = normalizePath("./Button", "./App.jsx");
    expect(candidates).toContain("./Button");
    expect(candidates).toContain("./Button.jsx");
    expect(candidates).toContain("./Button.js");
  });

  it("resolves ./Counter from subfolder", () => {
    const candidates = normalizePath("./Counter", "./components/Button.jsx");
    expect(candidates).toContain("./components/Counter");
    expect(candidates).toContain("./components/Counter.jsx");
  });

  it("resolves ../utils from subfolder (parent traversal)", () => {
    const candidates = normalizePath("../utils", "./components/Button.jsx");
    expect(candidates).toContain("./utils");
    expect(candidates).toContain("./utils.jsx");
    expect(candidates).toContain("./utils/index.jsx");
  });
});
