import { describe, it, expect } from "vitest";
import { COLLECTIONS, findCollection, resolveSlugs } from "./collections";
import { HUB_ACADEMIES } from "./hub-academies";
import { JOB_TARGETS } from "./job-targets";

const ITEMS = [{ slug: "a" }, { slug: "b" }, { slug: "c" }];

describe("resolveSlugs", () => {
  it("returns items in the requested order", () => {
    expect(resolveSlugs(["c", "a"], ITEMS).map((i) => i.slug)).toEqual(["c", "a"]);
  });

  it("skips slugs that do not exist", () => {
    expect(resolveSlugs(["a", "missing", "b"], ITEMS).map((i) => i.slug)).toEqual(["a", "b"]);
  });

  it("honours duplicates in the request", () => {
    expect(resolveSlugs(["a", "a"], ITEMS)).toHaveLength(2);
  });

  it("returns an empty list for an empty request", () => {
    expect(resolveSlugs([], ITEMS)).toEqual([]);
  });
});

describe("findCollection", () => {
  it("finds the Disney collection", () => {
    expect(findCollection("disney")?.title).toBe("Disney");
  });

  it("returns undefined for an unknown slug", () => {
    expect(findCollection("nope")).toBeUndefined();
  });
});

describe("collection data integrity", () => {
  it("has unique slugs", () => {
    const slugs = COLLECTIONS.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  for (const collection of COLLECTIONS) {
    describe(collection.slug, () => {
      it("resolves every academy slug against HUB_ACADEMIES", () => {
        expect(resolveSlugs(collection.academySlugs, HUB_ACADEMIES)).toHaveLength(
          collection.academySlugs.length,
        );
      });

      it("resolves every related academy slug against HUB_ACADEMIES", () => {
        expect(resolveSlugs(collection.relatedAcademySlugs, HUB_ACADEMIES)).toHaveLength(
          collection.relatedAcademySlugs.length,
        );
      });

      it("resolves every job target slug against JOB_TARGETS", () => {
        expect(resolveSlugs(collection.jobTargetSlugs, JOB_TARGETS)).toHaveLength(
          collection.jobTargetSlugs.length,
        );
      });

      it("does not list an academy as both own and related", () => {
        const own = new Set(collection.academySlugs);
        expect(collection.relatedAcademySlugs.filter((slug) => own.has(slug))).toEqual([]);
      });
    });
  }
});
