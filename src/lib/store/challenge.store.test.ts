import { describe, it, expect, beforeEach } from "vitest";
import { useChallengeStore } from "./challenge.store";
import type { FileMap } from "@/lib/challenges/file-tree";

const SEED_FILE_MAP: FileMap = {
  "./App.jsx": { content: "// original", language: "jsx", seed: true },
  "./styles.css": { content: "body{}", language: "css", seed: true },
};

beforeEach(() => {
  useChallengeStore.setState({ fileMaps: {}, folders: {} });
});

describe("getFileMap", () => {
  it("returns seedFileMap when no session exists", () => {
    const result = useChallengeStore.getState().getFileMap("test", SEED_FILE_MAP);
    expect(result).toEqual(SEED_FILE_MAP);
  });

  it("returns stored map after addFile", () => {
    useChallengeStore.getState().addFile("test", "./Button.jsx", { content: "// btn", language: "jsx", seed: false });
    const result = useChallengeStore.getState().getFileMap("test", SEED_FILE_MAP);
    expect(result["./Button.jsx"]?.content).toBe("// btn");
  });
});

describe("setFileContent", () => {
  it("updates content for an existing path", () => {
    useChallengeStore.getState().addFile("test", "./App.jsx", { content: "// old", language: "jsx", seed: true });
    useChallengeStore.getState().setFileContent("test", "./App.jsx", "// new");
    expect(useChallengeStore.getState().fileMaps["test"]["./App.jsx"].content).toBe("// new");
  });
});

describe("addFile", () => {
  it("stores new file entry", () => {
    useChallengeStore.getState().addFile("test", "./Button.jsx", { content: "", language: "jsx", seed: false });
    expect(useChallengeStore.getState().fileMaps["test"]["./Button.jsx"]).toBeDefined();
  });
});

describe("deleteFile", () => {
  it("removes file from map", () => {
    useChallengeStore.getState().addFile("test", "./Button.jsx", { content: "", language: "jsx", seed: false });
    useChallengeStore.getState().deleteFile("test", "./Button.jsx");
    expect(useChallengeStore.getState().fileMaps["test"]?.["./Button.jsx"]).toBeUndefined();
  });
});

describe("addFolder / deleteFolder", () => {
  it("stores folder path", () => {
    useChallengeStore.getState().addFolder("test", "./components");
    expect(useChallengeStore.getState().folders["test"]).toContain("./components");
  });

  it("deleteFolder removes folder and child files", () => {
    useChallengeStore.getState().addFile("test", "./components/Button.jsx", { content: "", language: "jsx", seed: false });
    useChallengeStore.getState().addFolder("test", "./components");
    useChallengeStore.getState().deleteFolder("test", "./components");
    expect(useChallengeStore.getState().folders["test"]).not.toContain("./components");
    expect(useChallengeStore.getState().fileMaps["test"]?.["./components/Button.jsx"]).toBeUndefined();
  });
});

describe("resetChallenge", () => {
  it("restores only seed files and clears user files and folders", () => {
    useChallengeStore.getState().addFile("test", "./Button.jsx", { content: "", language: "jsx", seed: false });
    useChallengeStore.getState().addFolder("test", "./components");
    useChallengeStore.getState().resetChallenge("test", SEED_FILE_MAP);
    const state = useChallengeStore.getState();
    expect(state.fileMaps["test"]).toEqual(SEED_FILE_MAP);
    expect(state.folders["test"]).toEqual([]);
  });
});
