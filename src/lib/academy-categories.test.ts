import { describe, it, expect } from "vitest";
import {
  ACADEMY_CATEGORIES,
  groupAcademiesByCategory,
  type AcademyCategory,
} from "./academy-categories";

function academy(slug: string, category: AcademyCategory) {
  return { slug, category };
}

describe("groupAcademiesByCategory", () => {
  it("returns groups in ACADEMY_CATEGORIES order regardless of input order", () => {
    const groups = groupAcademiesByCategory([
      academy("hulu", "disney"),
      academy("web", "fundamentals"),
      academy("react", "frontend"),
    ]);
    expect(groups.map((g) => g.id)).toEqual(["fundamentals", "frontend", "disney"]);
  });

  it("omits categories that have no academies", () => {
    const groups = groupAcademiesByCategory([academy("k8s", "platform-ops")]);
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe("platform-ops");
    expect(groups[0].label).toBe("Platform & Ops");
  });

  it("places every academy in exactly one group and keeps input order within a group", () => {
    const input = [
      academy("node", "backend-systems"),
      academy("ts", "fundamentals"),
      academy("express", "backend-systems"),
      academy("python", "fundamentals"),
    ];
    const groups = groupAcademiesByCategory(input);
    const placed = groups.flatMap((g) => g.academies.map((a) => a.slug));
    expect(placed).toHaveLength(input.length);
    expect(new Set(placed).size).toBe(input.length);
    expect(groups.find((g) => g.id === "backend-systems")?.academies.map((a) => a.slug)).toEqual([
      "node",
      "express",
    ]);
    expect(groups.reduce((sum, g) => sum + g.academies.length, 0)).toBe(input.length);
  });

  it("covers every category in the union with its label", () => {
    const groups = groupAcademiesByCategory(ACADEMY_CATEGORIES.map((c) => academy(c.id, c.id)));
    expect(groups.map((g) => g.label)).toEqual([
      "Fundamentals",
      "Frontend",
      "Backend & Systems",
      "Platform & Ops",
      "Disney",
    ]);
  });

  it("returns an empty list when there are no academies", () => {
    expect(groupAcademiesByCategory([])).toEqual([]);
  });
});
