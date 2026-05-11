import { describe, it, expect, beforeEach } from "vitest";
import { useChallengeStore } from "./challenge.store";
import type { ChallengeFile } from "@/lib/challenges/types";

const FILES: ChallengeFile[] = [
  { filename: "App.jsx", language: "jsx", content: "// original" },
  { filename: "styles.css", language: "css", content: "body{}" },
];

beforeEach(() => {
  useChallengeStore.setState({ sessions: {} });
});

describe("getFileContent", () => {
  it("returns original content when no session exists", () => {
    const result = useChallengeStore
      .getState()
      .getFileContent("test-challenge", "App.jsx", "// original");
    expect(result).toBe("// original");
  });

  it("returns saved content after setFileContent", () => {
    const store = useChallengeStore.getState();
    store.setFileContent("test-challenge", "App.jsx", "// edited");
    const result = useChallengeStore
      .getState()
      .getFileContent("test-challenge", "App.jsx", "// original");
    expect(result).toBe("// edited");
  });
});

describe("setFileContent", () => {
  it("persists content to sessions", () => {
    useChallengeStore.getState().setFileContent("slug", "App.jsx", "// new");
    expect(useChallengeStore.getState().sessions["slug"]["App.jsx"]).toBe("// new");
  });

  it("does not overwrite other files in the same session", () => {
    const store = useChallengeStore.getState();
    store.setFileContent("slug", "App.jsx", "// app");
    store.setFileContent("slug", "styles.css", "body{}");
    const s = useChallengeStore.getState().sessions["slug"];
    expect(s["App.jsx"]).toBe("// app");
    expect(s["styles.css"]).toBe("body{}");
  });
});

describe("resetChallenge", () => {
  it("restores original content for all files", () => {
    const store = useChallengeStore.getState();
    store.setFileContent("slug", "App.jsx", "// edited");
    store.resetChallenge("slug", FILES);
    const s = useChallengeStore.getState().sessions["slug"];
    expect(s["App.jsx"]).toBe("// original");
    expect(s["styles.css"]).toBe("body{}");
  });
});
