"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  CheckCircle2,
  ChevronDown,
  Code2,
  ListChecks,
  Star,
  ArrowLeft,
  Play,
} from "lucide-react";
import { Badge } from "@/components/ui";
import { useProgressStore } from "@/lib/store";
import type { Challenge } from "@/modules/web-fundamentals/data";

interface ChallengePageProps {
  challenge: Challenge;
}

const ACCENT = "#0ea5e9";

const difficultyColor: Record<string, string> = {
  easy: "#22c55e",
  medium: "#f59e0b",
  hard: "#ef4444",
};

const difficultyBg: Record<string, string> = {
  easy: "rgba(34,197,94,0.08)",
  medium: "rgba(245,158,11,0.08)",
  hard: "rgba(239,68,68,0.08)",
};

function CodeBlock({ label, code }: { label: string; code: string }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
      <div
        className="px-4 py-2.5 flex items-center gap-2"
        style={{ background: "var(--bg-surface)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Code2 size={13} style={{ color: ACCENT }} />
        <span className="text-xs font-medium text-secondary">{label}</span>
      </div>
      <div style={{ background: "var(--bg-elevated)" }}>
        <pre className="p-4 text-xs overflow-x-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

export default function ChallengePage({ challenge }: ChallengePageProps) {
  const [mounted, setMounted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [revealedHints, setRevealedHints] = useState<Set<number>>(new Set());
  const markModuleVisited = useProgressStore((s) => s.markModuleVisited);
  const markModuleComplete = useProgressStore((s) => s.markModuleComplete);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const slug = `challenge/${challenge.id}`;
    const snap = useProgressStore.getState().academies;
    setCompleted(snap["web-fundamentals"]?.modules?.[slug]?.completed === true);
    markModuleVisited("web-fundamentals", slug, challenge.title, 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, challenge.id]);

  function revealHint(idx: number) {
    setRevealedHints((prev) => new Set(prev).add(idx));
  }

  function handleMarkComplete() {
    markModuleComplete("web-fundamentals", `challenge/${challenge.id}`);
    setCompleted(true);
  }

  return (
    <div className="flex-1 min-w-0 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Back link */}
        <Link
          href={`/learn/web-fundamentals/module/${challenge.moduleId}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-secondary transition-colors mb-6"
        >
          <ArrowLeft size={12} />
          Back to module
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38 }}
          className="mb-8"
        >
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge
              variant={challenge.difficulty === "easy" ? "success" : challenge.difficulty === "medium" ? "warning" : "default"}
              className="text-[10px]"
            >
              {challenge.difficulty}
            </Badge>
            {challenge.conceptsCovered.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="default" className="text-[10px] text-muted">
                {tag}
              </Badge>
            ))}
            {mounted && completed && (
              <Badge variant="success" className="text-[10px]">
                <CheckCircle2 size={9} />
                Completed
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold text-primary tracking-tight mb-3">{challenge.title}</h1>
          <p className="text-secondary text-sm leading-relaxed">{challenge.description}</p>
        </motion.div>

        {/* Requirements */}
        <section
          className="mb-8 p-4 rounded-xl"
          style={{ background: `${ACCENT}08`, border: `1px solid ${ACCENT}25` }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: ACCENT }}>
            <ListChecks size={13} />
            Requirements
          </h2>
          <ul className="space-y-2">
            {challenge.requirements.map((req, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-secondary">
                <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: ACCENT, opacity: 0.7 }} />
                {req}
              </li>
            ))}
          </ul>
        </section>

        {/* Starter Code */}
        {(challenge.starterHtml || challenge.starterCss) && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
              <Code2 size={15} style={{ color: ACCENT }} />
              Starter Code
            </h2>
            <div className="space-y-3">
              {challenge.starterHtml && <CodeBlock label="HTML" code={challenge.starterHtml} />}
              {challenge.starterCss && <CodeBlock label="CSS" code={challenge.starterCss} />}
            </div>
          </section>
        )}

        {/* Expected Result */}
        <section
          className="mb-8 p-4 rounded-xl"
          style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)" }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-2 flex items-center gap-2 text-success">
            <CheckCircle2 size={13} />
            Expected Result
          </h2>
          <p className="text-sm text-secondary leading-relaxed">{challenge.expectedResult}</p>
        </section>

        {/* Hints */}
        {challenge.hints.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
              <Zap size={15} style={{ color: "#f59e0b" }} />
              Hints
            </h2>
            <div className="space-y-2">
              {challenge.hints.map((hint, i) => (
                <div key={i} className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(245,158,11,0.2)" }}>
                  {revealedHints.has(i) ? (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key="revealed"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ duration: 0.25 }}
                        className="p-4"
                        style={{ background: "rgba(245,158,11,0.05)" }}
                      >
                        <p className="text-xs font-semibold text-warning mb-1">Hint {i + 1}</p>
                        <p className="text-sm text-secondary leading-relaxed">{hint}</p>
                      </motion.div>
                    </AnimatePresence>
                  ) : (
                    <button
                      onClick={() => revealHint(i)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
                      style={{ background: "rgba(245,158,11,0.04)" }}
                    >
                      <span className="text-sm text-warning font-medium">Reveal Hint {i + 1}</span>
                      <ChevronDown size={14} style={{ color: "#f59e0b" }} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bonus Tasks */}
        {challenge.bonusTasks.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
              <Star size={15} style={{ color: "#a78bfa" }} />
              Bonus Tasks
            </h2>
            <div className="space-y-2">
              {challenge.bonusTasks.map((task, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl text-sm text-secondary leading-relaxed"
                  style={{ background: "rgba(167,139,250,0.05)", border: "1px solid rgba(167,139,250,0.18)" }}
                >
                  <span className="font-semibold mr-1.5" style={{ color: "#a78bfa" }}>+{i + 1}</span>
                  {task}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Open in Playground */}
        <div className="mb-4">
          <Link
            href={`/learn/web-fundamentals/playground/${challenge.id}`}
            className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors duration-150"
            style={{
              background: "rgba(99,102,241,0.1)",
              border: "1px solid rgba(99,102,241,0.3)",
              color: "var(--accent-secondary)",
            }}
          >
            <Play size={14} />
            Open in Playground
          </Link>
        </div>

        {/* Mark Complete */}
        {mounted && !completed && (
          <button
            onClick={handleMarkComplete}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-colors duration-150"
            style={{
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.3)",
              color: "var(--success)",
            }}
          >
            Mark challenge as complete ✓
          </button>
        )}

        {mounted && completed && (
          <div
            className="w-full py-3 rounded-xl text-sm font-semibold text-center"
            style={{
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.2)",
              color: "var(--success)",
            }}
          >
            <CheckCircle2 size={14} className="inline mr-2" />
            Challenge completed
          </div>
        )}
      </div>
    </div>
  );
}
