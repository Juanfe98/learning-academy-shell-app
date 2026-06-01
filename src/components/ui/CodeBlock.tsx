import { codeToHtml } from "shiki";
import CopyButton from "./CopyButton";

interface CodeBlockProps {
  code: string;
  lang?: string;
  filename?: string;
}

export default async function CodeBlock({
  code,
  lang = "text",
  filename,
}: CodeBlockProps) {
  const html = await codeToHtml(code.trim(), {
    lang,
    theme: "github-dark",
  });

  return (
    <div
      className="relative group my-6 rounded-xl overflow-hidden"
      style={{ border: "1px solid rgba(255,255,255,0.1)" }}
    >
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{
          background: "rgba(255,255,255,0.04)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <span className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
          {filename ?? lang}
        </span>
        <CopyButton code={code.trim()} />
      </div>
      <div
        className="[&_pre]:!m-0 [&_pre]:!rounded-none [&_pre]:p-5 [&_pre]:overflow-x-auto [&_pre]:text-[13px] [&_pre]:leading-relaxed [&_pre]:font-mono"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
