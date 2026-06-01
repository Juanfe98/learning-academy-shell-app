"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui";

const DIFFICULTY_VARIANT: Record<string, "success" | "warning" | "default"> = {
  beginner: "success",
  intermediate: "warning",
  advanced: "default",
};

interface Props {
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  tags: string[];
  problemStatement?: string;
}

// ---------------------------------------------------------------------------
// Minimal markdown renderer — covers the subset used in challenge specs:
//   ## Heading, ### Sub-heading, - list, ```code block```, **bold**, `inline`
// ---------------------------------------------------------------------------

function inlineRender(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("`") && part.endsWith("`"))
          return (
            <code
              key={i}
              className="font-mono text-[11px] px-1 py-0.5 rounded"
              style={{ background: "rgba(99,102,241,0.1)", color: "var(--accent-secondary)" }}
            >
              {part.slice(1, -1)}
            </code>
          );
        return part;
      })}
    </>
  );
}

function renderMarkdown(text: string): ReactNode {
  const lines = text.split("\n");
  const nodes: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Horizontal rule
    if (/^-{3,}$/.test(line.trim())) {
      nodes.push(<hr key={i} style={{ borderColor: "var(--border-subtle)", margin: "10px 0" }} />);
      i++;
      continue;
    }

    // Code block
    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <pre
          key={i}
          className="text-[11px] font-mono leading-relaxed rounded p-2 overflow-x-auto"
          style={{ background: "var(--bg-base)", color: "var(--text-secondary)", margin: "4px 0" }}
        >
          {codeLines.join("\n")}
        </pre>
      );
      i++;
      continue;
    }

    // # Title
    if (line.startsWith("# ")) {
      nodes.push(
        <h2
          key={i}
          className="text-xs font-bold mt-2 mb-1"
          style={{ color: "var(--text-primary)" }}
        >
          {line.slice(2)}
        </h2>
      );
      i++;
      continue;
    }

    // ## Heading
    if (line.startsWith("## ")) {
      nodes.push(
        <h3
          key={i}
          className="text-[11px] font-semibold uppercase tracking-widest mt-4 mb-1"
          style={{ color: "var(--accent-secondary)" }}
        >
          {line.slice(3)}
        </h3>
      );
      i++;
      continue;
    }

    // ### Sub-heading
    if (line.startsWith("### ")) {
      nodes.push(
        <h4 key={i} className="text-xs font-semibold mt-3 mb-1" style={{ color: "var(--text-primary)" }}>
          {line.slice(4)}
        </h4>
      );
      i++;
      continue;
    }

    // Unordered list
    if (line.startsWith("- ")) {
      const items: ReactNode[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(
          <li key={i} className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {inlineRender(lines[i].slice(2))}
          </li>
        );
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-0.5 my-1">
          {items}
        </ul>
      );
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph — collect consecutive non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("-") &&
      !lines[i].startsWith("```") &&
      !/^-{3,}$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length) {
      nodes.push(
        <p key={`p-${i}`} className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {inlineRender(paraLines.join(" "))}
        </p>
      );
    } else {
      i++; // unrecognized line — skip to prevent infinite loop
    }
  }

  return nodes;
}

export default function ChallengeDescription({ description, difficulty, tags, problemStatement }: Props) {
  return (
    <div
      className="flex-1 overflow-y-auto p-4 space-y-3"
      style={{ background: "var(--bg-surface)" }}
    >
      <div className="flex items-start gap-2 flex-wrap">
        <Badge variant={DIFFICULTY_VARIANT[difficulty]}>{difficulty}</Badge>
        {tags.map((tag) => (
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

      {problemStatement ? (
        <div>{renderMarkdown(problemStatement)}</div>
      ) : (
        <div>
          <h2
            className="text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            Problem
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {description}
          </p>
        </div>
      )}
    </div>
  );
}
