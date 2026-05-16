"use client";

import { memo, useMemo, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X, SearchX } from "lucide-react";
import type { Challenge } from "@/lib/challenges/types";
import ChallengeCard from "./ChallengeCard";

// Preload Babel in background while user browses the list so the first
// challenge click doesn't freeze the main thread during module evaluation.
function useBabelPreload() {
  useEffect(() => {
    import("@babel/standalone").catch(() => {/* ignore — will retry on challenge load */});
  }, []);
}

export type ChallengeListItem = Pick<
  Challenge,
  "slug" | "title" | "description" | "difficulty" | "environment" | "tags"
>;

const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const DIFFICULTY_COLOR: Record<Difficulty, { active: string; glow: string }> = {
  beginner: {
    active: "var(--success)",
    glow: "rgba(34,197,94,0.25)",
  },
  intermediate: {
    active: "var(--warning)",
    glow: "rgba(245,158,11,0.25)",
  },
  advanced: {
    active: "var(--accent-primary)",
    glow: "rgba(99,102,241,0.3)",
  },
};

const MemoCard = memo(ChallengeCard);

interface ChallengeFilterGridProps {
  challenges: ChallengeListItem[];
}

export default function ChallengeFilterGrid({ challenges }: ChallengeFilterGridProps) {
  useBabelPreload();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlQ = searchParams.get("q") ?? "";
  const difficulties = useMemo(
    () =>
      new Set(
        searchParams
          .getAll("d")
          .filter((v): v is Difficulty => (DIFFICULTIES as readonly string[]).includes(v))
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams.toString()]
  );

  const hasFilters = urlQ !== "" || difficulties.size > 0;

  const [inputValue, setInputValue] = useState(urlQ);

  useEffect(() => {
    setInputValue(urlQ);
  }, [urlQ]);

  const updateParams = useCallback(
    (patch: { q?: string; d?: string[] }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (patch.q !== undefined) {
        patch.q ? params.set("q", patch.q) : params.delete("q");
      }
      if (patch.d !== undefined) {
        params.delete("d");
        patch.d.forEach((v) => params.append("d", v));
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // Debounce search → URL (300ms)
  useEffect(() => {
    if (inputValue === urlQ) return;
    const id = setTimeout(() => {
      updateParams({ q: inputValue, d: [...difficulties] });
    }, 300);
    return () => clearTimeout(id);
  }, [inputValue]); // intentionally narrow

  const toggleDifficulty = useCallback(
    (d: Difficulty) => {
      const next = new Set(difficulties);
      next.has(d) ? next.delete(d) : next.add(d);
      updateParams({ q: inputValue, d: [...next] });
    },
    [difficulties, inputValue, updateParams]
  );

  const clearFilters = useCallback(() => {
    setInputValue("");
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  const filtered = useMemo(() => {
    const q = urlQ.toLowerCase();
    return challenges.filter((c) => {
      const matchesSearch =
        !q ||
        c.title.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q));

      const matchesDifficulty =
        difficulties.size === 0 || difficulties.has(c.difficulty as Difficulty);

      return matchesSearch && matchesDifficulty;
    });
  }, [challenges, urlQ, difficulties]);

  const difficultyCounts = useMemo(
    () =>
      Object.fromEntries(
        DIFFICULTIES.map((d) => [d, challenges.filter((c) => c.difficulty === d).length])
      ) as Record<Difficulty, number>,
    [challenges]
  );

  const activeFilterCount = (urlQ ? 1 : 0) + difficulties.size;

  return (
    <div className="space-y-5">
      {/* Controls row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        {/* Search input */}
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--text-muted)" }}
          />
          <input
            type="text"
            placeholder="Search challenges..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full pl-8 pr-8 py-2 rounded-xl text-sm outline-none transition-colors duration-150"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border-subtle)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          {inputValue && (
            <button
              onClick={() => setInputValue("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
              style={{ color: "var(--text-secondary)" }}
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Difficulty pills with counts */}
        <div className="flex items-center gap-2">
          {DIFFICULTIES.map((d) => {
            const active = difficulties.has(d);
            const { active: activeColor, glow } = DIFFICULTY_COLOR[d];
            return (
              <button
                key={d}
                onClick={() => toggleDifficulty(d)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer"
                style={
                  active
                    ? {
                        background: activeColor,
                        color: "#fff",
                        border: `1px solid ${activeColor}`,
                        boxShadow: `0 0 0 3px ${glow}`,
                      }
                    : {
                        background: "transparent",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--border-subtle)",
                      }
                }
              >
                {DIFFICULTY_LABEL[d]}
                <span
                  className="text-[10px] font-bold tabular-nums"
                  style={{ opacity: active ? 0.85 : 0.5 }}
                >
                  {difficultyCounts[d]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Count + clear */}
      <div className="flex items-center gap-3">
        <p
          className="text-xs"
          style={{
            color: hasFilters ? "var(--accent-secondary)" : "var(--text-muted)",
          }}
        >
          {filtered.length} of {challenges.length} challenges
          {hasFilters &&
            ` · ${activeFilterCount} filter${activeFilterCount !== 1 ? "s" : ""} active`}
        </p>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs flex items-center gap-1 transition-opacity hover:opacity-80 cursor-pointer"
            style={{ color: "var(--text-secondary)" }}
          >
            <X size={11} />
            Clear filters
          </button>
        )}
      </div>

      {/* Grid / empty state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16">
          <div
            className="p-4 rounded-2xl"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <SearchX size={28} style={{ color: "var(--text-muted)" }} />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              No challenges match your filters
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Try a different search term or difficulty level
            </p>
          </div>
          <button
            onClick={clearFilters}
            className="text-xs px-4 py-2 rounded-full transition-all duration-150 cursor-pointer hover:opacity-90"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
              color: "var(--text-secondary)",
            }}
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {filtered.map((c) => (
            <MemoCard key={c.slug} challenge={c} />
          ))}
        </div>
      )}
    </div>
  );
}
