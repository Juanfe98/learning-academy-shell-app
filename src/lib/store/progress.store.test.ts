import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { computeStreak } from "./progress.store";

function makeStreak(
  current: number,
  longest: number,
  lastStudiedDate: string
) {
  return { current, longest, lastStudiedDate };
}

describe("computeStreak", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("makes no change when already studied today", () => {
    vi.setSystemTime(new Date("2026-04-18T10:00:00Z"));
    const streak = makeStreak(5, 10, "2026-04-18");
    const result = computeStreak(streak);
    expect(result).toEqual(streak); // exact same object reference or values
    expect(result.current).toBe(5);
    expect(result.longest).toBe(10);
    expect(result.lastStudiedDate).toBe("2026-04-18");
  });

  it("increments streak for consecutive days (yesterday → today)", () => {
    vi.setSystemTime(new Date("2026-04-18T10:00:00Z"));
    const result = computeStreak(makeStreak(5, 10, "2026-04-17"));
    expect(result.current).toBe(6);
    expect(result.longest).toBe(10); // longest not affected
    expect(result.lastStudiedDate).toBe("2026-04-18");
  });

  it("updates longest when new current exceeds it", () => {
    vi.setSystemTime(new Date("2026-04-18T10:00:00Z"));
    const result = computeStreak(makeStreak(10, 10, "2026-04-17"));
    expect(result.current).toBe(11);
    expect(result.longest).toBe(11);
  });

  it("resets streak to 1 when gap is 2 days", () => {
    vi.setSystemTime(new Date("2026-04-18T10:00:00Z"));
    const result = computeStreak(makeStreak(5, 10, "2026-04-16"));
    expect(result.current).toBe(1);
    expect(result.longest).toBe(10); // longest preserved
    expect(result.lastStudiedDate).toBe("2026-04-18");
  });

  it("resets streak to 1 when gap is many days", () => {
    vi.setSystemTime(new Date("2026-04-18T10:00:00Z"));
    const result = computeStreak(makeStreak(30, 30, "2026-01-01"));
    expect(result.current).toBe(1);
    expect(result.longest).toBe(30);
  });

  it("starts fresh from zero on first ever study (empty date)", () => {
    vi.setSystemTime(new Date("2026-04-18T10:00:00Z"));
    const result = computeStreak(makeStreak(0, 0, ""));
    expect(result.current).toBe(1);
    expect(result.longest).toBe(1);
    expect(result.lastStudiedDate).toBe("2026-04-18");
  });

  it("handles midnight boundary — last studied just before midnight is still yesterday", () => {
    // It's 00:01 on the 19th; last studied at any point on the 18th counts as yesterday
    vi.setSystemTime(new Date("2026-04-19T00:01:00Z"));
    const result = computeStreak(makeStreak(3, 5, "2026-04-18"));
    expect(result.current).toBe(4);
    expect(result.lastStudiedDate).toBe("2026-04-19");
  });

  it("never decreases longest when resetting streak", () => {
    vi.setSystemTime(new Date("2026-04-18T10:00:00Z"));
    const result = computeStreak(makeStreak(50, 100, "2025-01-01"));
    expect(result.current).toBe(1);
    expect(result.longest).toBe(100); // unchanged
  });
});
