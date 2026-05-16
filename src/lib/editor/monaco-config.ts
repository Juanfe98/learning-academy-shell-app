import type { Monaco } from "@monaco-editor/react";

let initialized = false;
let reactTypesLoaded = false;

export function initMonacoDefaults(monaco: Monaco): void {
  if (initialized) return;
  initialized = true;

  monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);

  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    module: monaco.languages.typescript.ModuleKind.CommonJS,
    jsx: monaco.languages.typescript.JsxEmit.React,
    jsxFactory: "React.createElement",
    jsxFragmentFactory: "React.Fragment",
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    allowNonTsExtensions: true,
    allowJs: true,
  });

  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });

  monaco.editor.defineTheme("se-hub-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      // Keywords — blue (#569CD6 VS Code Dark+)
      { token: "keyword", foreground: "#569CD6" },
      { token: "keyword.ts", foreground: "#569CD6" },
      { token: "keyword.tsx", foreground: "#569CD6" },

      // Storage modifiers (const, let, var, type, interface, etc.)
      { token: "storage.modifier", foreground: "#569CD6" },

      // Strings — orange (#CE9178)
      { token: "string", foreground: "#CE9178" },
      { token: "string.ts", foreground: "#CE9178" },
      { token: "string.tsx", foreground: "#CE9178" },
      { token: "string.escape", foreground: "#D7BA7D" },

      // Numbers — light green (#B5CEA8)
      { token: "number", foreground: "#B5CEA8" },
      { token: "number.ts", foreground: "#B5CEA8" },
      { token: "number.tsx", foreground: "#B5CEA8" },

      // Comments — green italic (#6A9955)
      { token: "comment", foreground: "#6A9955", fontStyle: "italic" },
      { token: "comment.ts", foreground: "#6A9955", fontStyle: "italic" },
      { token: "comment.tsx", foreground: "#6A9955", fontStyle: "italic" },

      // Regular expressions — red (#D16969)
      { token: "regexp", foreground: "#D16969" },

      // Type identifiers — teal (#4EC9B0)
      { token: "type", foreground: "#4EC9B0" },
      { token: "type.identifier.ts", foreground: "#4EC9B0" },
      { token: "type.identifier.tsx", foreground: "#4EC9B0" },
      { token: "entity.name.type", foreground: "#4EC9B0" },

      // JSX / HTML element tag names — teal (#4EC9B0, same as VS Code Dark+)
      { token: "tag", foreground: "#4EC9B0" },
      { token: "tag.ts", foreground: "#4EC9B0" },
      { token: "tag.tsx", foreground: "#4EC9B0" },

      // JSX angle bracket delimiters — gray (#808080)
      { token: "delimiter.angle", foreground: "#808080" },
      { token: "delimiter.angle.ts", foreground: "#808080" },
      { token: "delimiter.angle.tsx", foreground: "#808080" },

      // JSX attribute names — light blue (#9CDCFE)
      { token: "attribute.name", foreground: "#9CDCFE" },
      { token: "attribute.name.ts", foreground: "#9CDCFE" },
      { token: "attribute.name.tsx", foreground: "#9CDCFE" },

      // JSX attribute string values — orange (#CE9178)
      { token: "attribute.value", foreground: "#CE9178" },
      { token: "attribute.value.ts", foreground: "#CE9178" },
      { token: "attribute.value.tsx", foreground: "#CE9178" },

      // JSX attribute numeric values — light green
      { token: "attribute.value.number.tsx", foreground: "#B5CEA8" },

      // JSX expression braces { } — gray
      { token: "delimiter.bracket.tsx", foreground: "#D4D4D4" },

      // Identifiers / variables — light blue (#9CDCFE, VS Code parameter color)
      { token: "identifier.ts", foreground: "#9CDCFE" },
      { token: "identifier.tsx", foreground: "#9CDCFE" },

      // Type/interface/class member access — gold (#D7BA7D)
      { token: "variable.predefined", foreground: "#DCDCAA" },
    ],
    colors: {
      "editor.background": "#1a1a24",
      "editorGutter.background": "#13131a",
      "editorLineNumber.foreground": "#5a5a78",
      "editorLineNumber.activeForeground": "#a0a0b8",
      "editor.selectionBackground": "#6366f130",
      "editor.selectionHighlightBackground": "#6366f118",
      "editor.lineHighlightBackground": "#ffffff05",
      "editorCursor.foreground": "#0ea5e9",
      "editorError.foreground": "#ef4444",
      "editorWarning.foreground": "#f59e0b",
      "editorBracketMatch.background": "#0ea5e920",
      "editorBracketMatch.border": "#0ea5e960",
      "editor.findMatchBackground": "#f59e0b40",
      "editor.findMatchHighlightBackground": "#f59e0b20",
    },
  });

  monaco.editor.setTheme("se-hub-dark");
}

export function getEditorOptions(): Record<string, unknown> {
  return {
    minimap: { enabled: false },
    fontSize: 13,
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontLigatures: true,
    lineNumbers: "on",
    folding: true,
    wordWrap: "off",
    scrollBeyondLastLine: false,
    automaticLayout: true,
    padding: { top: 8 },
    bracketPairColorization: { enabled: true },
    matchBrackets: "always",
    cursorBlinking: "smooth",
    smoothScrolling: true,
    renderLineHighlight: "line",
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
    // Code Intelligence (Group 2)
    stickyScroll: { enabled: true },
    quickSuggestions: { other: true, comments: true, strings: true },
    parameterHints: { enabled: true },
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: "on",
  };
}

export async function loadReactTypes(monaco: Monaco): Promise<void> {
  if (reactTypesLoaded) return;
  reactTypesLoaded = true;

  try {
    const content = await fetch(
      "https://unpkg.com/@types/react@18/index.d.ts"
    ).then((r) => r.text());

    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      content,
      "file:///node_modules/@types/react/index.d.ts"
    );
  } catch {
    // Degraded mode — IntelliSense works for non-React types
  }
}
