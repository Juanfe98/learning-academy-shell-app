import Link from "next/link";
import { Code2 } from "lucide-react";
import { CHALLENGE_REGISTRY } from "@/lib/challenges/registry";
import { Badge } from "@/components/ui";

const DIFFICULTY_VARIANT: Record<string, "success" | "warning" | "default"> = {
  beginner: "success",
  intermediate: "warning",
  advanced: "default",
};

export default function PlaygroundListPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Code2 size={22} style={{ color: "var(--accent-primary)" }} />
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Coding Playground
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Hands-on React challenges with live preview and console.
        </p>
      </div>

      <div className="grid gap-3">
        {CHALLENGE_REGISTRY.map((challenge) => (
          <Link
            key={challenge.slug}
            href={`/playground/${challenge.slug}`}
            className="block p-4 rounded-xl transition-colors"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                  {challenge.title}
                </p>
                <p
                  className="text-xs leading-relaxed line-clamp-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {challenge.description}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {challenge.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                      style={{
                        background: "rgba(99,102,241,0.1)",
                        border: "1px solid rgba(99,102,241,0.2)",
                        color: "var(--accent-secondary)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {challenge.environment !== "react-js" && (
                  <span
                    className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                    style={{
                      background: "rgba(99,102,241,0.15)",
                      border: "1px solid rgba(99,102,241,0.3)",
                      color: "var(--accent-primary)",
                    }}
                  >
                    TS
                  </span>
                )}
                <Badge variant={DIFFICULTY_VARIANT[challenge.difficulty]}>
                  {challenge.difficulty}
                </Badge>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
