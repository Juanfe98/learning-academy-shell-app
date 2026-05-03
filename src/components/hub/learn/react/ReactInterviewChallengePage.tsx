"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Code2, ListChecks, Sparkles, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui";
import { useProgressStore } from "@/lib/store";
import type { ReactDeepDiveChallenge } from "@/modules/react-deep-dive/interview-challenges-data";

const ACCENT = "#06b6d4";

const difficultyVariant = {
  easy: "success",
  medium: "warning",
  hard: "default",
} as const;

function CodeBlock({ label, code }: { label: string; code: string }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div
        className="px-4 py-2.5 flex items-center gap-2"
        style={{
          background: "var(--bg-surface)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
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

export default function ReactInterviewChallengePage({
  challenge,
}: {
  challenge: ReactDeepDiveChallenge;
}) {
  const [mounted, setMounted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const markModuleVisited = useProgressStore((s) => s.markModuleVisited);
  const markModuleComplete = useProgressStore((s) => s.markModuleComplete);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const slug = `challenge/${challenge.id}`;
    const snap = useProgressStore.getState().academies;
    setCompleted(snap["react-deep-dive"]?.modules?.[slug]?.completed === true);
    markModuleVisited("react-deep-dive", slug, challenge.title, challenge.estimatedMinutes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, challenge.id]);

  function handleMarkComplete() {
    markModuleComplete("react-deep-dive", `challenge/${challenge.id}`);
    setCompleted(true);
  }

  return (
    <div className="flex-1 min-w-0">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link
          href="/learn/react-deep-dive/interview-challenges"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-secondary transition-colors mb-6"
        >
          <ArrowLeft size={12} />
          Back to interview challenges
        </Link>

        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant={difficultyVariant[challenge.difficulty]} className="text-[10px]">
              {challenge.difficulty}
            </Badge>
            {challenge.tags.map((tag) => (
              <Badge key={tag} variant="default" className="text-[10px]">
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

          <h1 className="text-2xl font-bold text-primary tracking-tight mb-3">
            {challenge.title}
          </h1>
          <p className="text-secondary text-sm leading-relaxed">{challenge.summary}</p>
        </div>

        <section
          className="mb-8 p-4 rounded-xl"
          style={{ background: `${ACCENT}08`, border: `1px solid ${ACCENT}25` }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: ACCENT }}>
            <Sparkles size={13} />
            Scenario
          </h2>
          <p className="text-sm text-secondary leading-relaxed">{challenge.scenario}</p>
        </section>

        {challenge.targetImage && (
          <section
            className="mb-8 p-4 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2 text-primary">
              <Sparkles size={13} style={{ color: ACCENT }} />
              Mock Target
            </h2>
            <div className="overflow-hidden rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              <img
                src={challenge.targetImage.src}
                alt={challenge.targetImage.alt}
                className="block w-full h-auto"
              />
            </div>
            {challenge.targetImage.caption && (
              <p className="mt-3 text-xs text-muted leading-relaxed">{challenge.targetImage.caption}</p>
            )}
          </section>
        )}

        <section className="mb-8">
          <h2 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
            <ListChecks size={15} style={{ color: ACCENT }} />
            What your answer should cover
          </h2>
          <div className="space-y-2">
            {challenge.deliverables.map((item, index) => (
              <div
                key={item}
                className="p-3 rounded-xl text-sm text-secondary leading-relaxed"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <strong className="text-primary mr-2">{index + 1}.</strong>
                {item}
              </div>
            ))}
          </div>
        </section>

        {challenge.starterBlocks && challenge.starterBlocks.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
              <Code2 size={15} style={{ color: ACCENT }} />
              Starter context
            </h2>
            <div className="space-y-3">
              {challenge.starterBlocks.map((block) => (
                <CodeBlock key={block.label} label={block.label} code={block.code} />
              ))}
            </div>
          </section>
        )}

        <section
          className="mb-8 p-4 rounded-xl"
          style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-2 flex items-center gap-2 text-danger">
            <AlertTriangle size={13} />
            Common traps
          </h2>
          <ul className="space-y-2">
            {challenge.commonPitfalls.map((pitfall) => (
              <li key={pitfall} className="text-sm text-secondary leading-relaxed">
                {pitfall}
              </li>
            ))}
          </ul>
        </section>

        <section
          className="mb-8 p-4 rounded-xl"
          style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)" }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-2 flex items-center gap-2 text-success">
            <CheckCircle2 size={13} />
            What strong answers sound like
          </h2>
          <ul className="space-y-2">
            {challenge.strongSignals.map((signal) => (
              <li key={signal} className="text-sm text-secondary leading-relaxed">
                {signal}
              </li>
            ))}
          </ul>
        </section>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link
            href="/learn/react-deep-dive/interview-challenges"
            className="text-sm font-medium transition-colors"
            style={{ color: "var(--accent-secondary)" }}
          >
            Back to all React challenges
          </Link>

          <button
            onClick={handleMarkComplete}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: completed ? "rgba(34,197,94,0.12)" : `${ACCENT}18`,
              color: completed ? "var(--success)" : "var(--text-primary)",
              border: completed
                ? "1px solid rgba(34,197,94,0.25)"
                : `1px solid ${ACCENT}35`,
            }}
          >
            <CheckCircle2 size={14} />
            {completed ? "Completed" : "Mark challenge complete"}
          </button>
        </div>
      </div>
    </div>
  );
}
