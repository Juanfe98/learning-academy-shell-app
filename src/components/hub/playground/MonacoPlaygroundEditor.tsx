"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import type { editor as MonacoEditor, IDisposable, languages } from "monaco-editor";
import type { Monaco } from "@monaco-editor/react";
import { initMonacoDefaults, getEditorOptions, loadReactTypes } from "@/lib/editor/monaco-config";
import type { FileMap } from "@/lib/challenges/file-tree";
import EditorTabBar from "./EditorTabBar";
import EditorBreadcrumbs from "./EditorBreadcrumbs";
import EditorStatusBar, { getLanguageLabel } from "./EditorStatusBar";

interface Props {
  filename: string;
  value: string;
  onChange: (value: string) => void;
  fileMap?: FileMap;
  onFileNavigate?: (path: string) => void;
  openTabs: string[];
  onTabSelect: (path: string) => void;
  onTabClose: (path: string) => void;
}

const FILE_PREFIX = "file:///challenge/";

function toUri(path: string): string {
  return FILE_PREFIX + path.replace(/^\.\//, "");
}

function toPath(uri: string): string {
  return "./" + uri.replace(FILE_PREFIX, "");
}

function getLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "ts" || ext === "tsx") return "typescript";
  if (ext === "js" || ext === "jsx") return "javascript";
  if (ext === "css") return "css";
  return "typescript";
}

export default function MonacoPlaygroundEditor({
  filename,
  value,
  onChange,
  fileMap = {},
  onFileNavigate,
  openTabs,
  onTabSelect,
  onTabClose,
}: Props) {
  const monaco = useMonaco();
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [diagnostics, setDiagnostics] = useState({ errors: 0, warnings: 0 });
  const modelsRef = useRef<Map<string, MonacoEditor.ITextModel>>(new Map());
  const fileMapKeysRef = useRef<string>("");
  const disposablesRef = useRef<IDisposable[]>([]);

  // Keep latest prop values accessible inside handleMount (called from @monaco-editor/react useEffect)
  const fileMapRef = useRef(fileMap);
  fileMapRef.current = fileMap;
  const filenameRef = useRef(filename);
  filenameRef.current = filename;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onFileNavigateRef = useRef(onFileNavigate);
  onFileNavigateRef.current = onFileNavigate;

  const language = useMemo(() => getLanguageLabel(filename), [filename]);

  // One-time Monaco initialization
  useEffect(() => {
    if (!monaco) return;
    initMonacoDefaults(monaco);
    loadReactTypes(monaco);
  }, [monaco]);

  // Sync models when fileMap keys or content change AFTER initial mount
  useEffect(() => {
    if (!monaco) return;

    const newKeys = Object.keys(fileMap).sort().join("|");
    if (newKeys === fileMapKeysRef.current) {
      // Same file set — update content only (e.g. reset, external change)
      for (const [path, entry] of Object.entries(fileMap)) {
        const model = modelsRef.current.get(toUri(path));
        if (model && model.getValue() !== entry.content) {
          model.setValue(entry.content);
        }
      }
      return;
    }

    // File set changed (file added / deleted) — dispose all and recreate
    fileMapKeysRef.current = newKeys;
    modelsRef.current.forEach((m) => m.dispose());
    modelsRef.current.clear();

    for (const [path, entry] of Object.entries(fileMap)) {
      const uri = toUri(path);
      const monacoUri = monaco.Uri.parse(uri);
      const existing = monaco.editor.getModel(monacoUri);
      if (existing) existing.dispose();
      const model = monaco.editor.createModel(entry.content, getLanguage(path), monacoUri);
      modelsRef.current.set(uri, model);
    }

    const activeUri = toUri(filename);
    const activeModel = modelsRef.current.get(activeUri);
    if (editorRef.current && activeModel) {
      editorRef.current.setModel(activeModel);
    }
  }, [monaco, fileMap, filename]);

  // Switch active model when user selects a different file
  useEffect(() => {
    if (!monaco || !editorRef.current) return;
    const uri = toUri(filename);
    const model = modelsRef.current.get(uri);
    if (!model || editorRef.current.getModel() === model) return;
    editorRef.current.setModel(model);
  }, [monaco, filename]);

  function handleMount(
    editor: MonacoEditor.IStandaloneCodeEditor,
    monacoInstance: Monaco
  ) {
    editorRef.current = editor;

    // Create all models synchronously here so there is no race between
    // handleMount (child effect) and the model-creation useEffect (parent effect).
    const currentFileMap = fileMapRef.current;
    const currentFilename = filenameRef.current;
    const newKeys = Object.keys(currentFileMap).sort().join("|");
    fileMapKeysRef.current = newKeys;

    for (const [path, entry] of Object.entries(currentFileMap)) {
      const uri = toUri(path);
      const monacoUri = monacoInstance.Uri.parse(uri);
      const existing = monacoInstance.editor.getModel(monacoUri);
      if (existing) existing.dispose();
      const model = monacoInstance.editor.createModel(entry.content, getLanguage(path), monacoUri);
      modelsRef.current.set(uri, model);
    }

    // Set active model immediately — editor shows content on first paint
    const activeUri = toUri(currentFilename);
    const activeModel = modelsRef.current.get(activeUri);
    if (activeModel) editor.setModel(activeModel);

    // onChange — read from ref so we always call the latest handler
    disposablesRef.current.push(
      editor.onDidChangeModelContent(() => {
        onChangeRef.current(editor.getValue());
      })
    );

    // Cursor position → status bar
    disposablesRef.current.push(
      editor.onDidChangeCursorPosition((e) => {
        setCursorPos({ line: e.position.lineNumber, col: e.position.column });
      })
    );

    // Diagnostics → status bar
    disposablesRef.current.push(
      monacoInstance.editor.onDidChangeMarkers(() => {
        const model = editor.getModel();
        if (!model) return;
        const markers = monacoInstance.editor.getModelMarkers({ resource: model.uri });
        setDiagnostics({
          errors:   markers.filter((m: MonacoEditor.IMarker) => m.severity === monacoInstance.MarkerSeverity.Error).length,
          warnings: markers.filter((m: MonacoEditor.IMarker) => m.severity === monacoInstance.MarkerSeverity.Warning).length,
        });
      })
    );

    // Format on Ctrl+S / Cmd+S
    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS,
      () => { editor.getAction("editor.action.formatDocument")?.run(); }
    );

    // Go-to-definition cross-file handler
    disposablesRef.current.push(
      monacoInstance.editor.registerEditorOpener({
        openCodeEditor(
          _source: unknown,
          resource: { toString(): string },
          selectionOrPosition?: { lineNumber: number; column: number } | { startLineNumber: number; startColumn: number }
        ) {
          const uri = resource.toString();
          const targetModel = modelsRef.current.get(uri);
          if (!targetModel) return false;

          editor.setModel(targetModel);

          if (selectionOrPosition) {
            const pos =
              "startLineNumber" in selectionOrPosition
                ? { lineNumber: selectionOrPosition.startLineNumber, column: selectionOrPosition.startColumn }
                : selectionOrPosition;
            editor.setPosition(pos);
            editor.revealLineInCenter(pos.lineNumber);
          }

          onFileNavigateRef.current?.(toPath(uri));
          return true;
        },
      })
    );

    // Import path completion provider
    disposablesRef.current.push(
      monacoInstance.languages.registerCompletionItemProvider(["typescript", "javascript"], {
        triggerCharacters: [".", "/", '"', "'"],
        provideCompletionItems(
          model: MonacoEditor.ITextModel,
          position: { lineNumber: number; column: number }
        ): languages.CompletionList {
          const lineContent = model.getLineContent(position.lineNumber);
          const textBefore = lineContent.slice(0, position.column - 1);

          const importMatch = textBefore.match(/(?:from\s+|import\s*\(\s*)["']([^"']*)/);
          if (!importMatch) return { suggestions: [] };

          const partial = importMatch[1];
          if (!partial.startsWith(".")) return { suggestions: [] };

          const currentUri = model.uri.toString();
          const currentDir =
            currentUri.lastIndexOf("/") > 0
              ? currentUri.substring(0, currentUri.lastIndexOf("/"))
              : FILE_PREFIX.slice(0, -1);

          const suggestions: languages.CompletionItem[] = [];

          modelsRef.current.forEach((_, registeredUri) => {
            if (registeredUri === currentUri) return;
            if (!registeredUri.startsWith(FILE_PREFIX)) return;

            const targetPath = registeredUri.slice(FILE_PREFIX.length);
            const currentDirPath = currentDir.slice(FILE_PREFIX.length);
            const rel = computeRelativePath(currentDirPath, targetPath);
            const relNoExt = rel.replace(/\.(tsx?|jsx?)$/, "");

            if (partial.length > 0 && !relNoExt.startsWith(partial)) return;

            const startCol = position.column - partial.length;
            suggestions.push({
              label: relNoExt,
              kind: monacoInstance.languages.CompletionItemKind.File,
              insertText: relNoExt,
              range: {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: startCol,
                endColumn: position.column,
              },
              detail: targetPath,
            });
          });

          return { suggestions };
        },
      })
    );
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disposablesRef.current.forEach((d) => d.dispose());
      disposablesRef.current = [];
      modelsRef.current.forEach((m) => m.dispose());
      modelsRef.current.clear();
    };
  }, []);

  const activeFile = "./" + filename;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <EditorTabBar
        openTabs={openTabs}
        activeFile={activeFile}
        onTabSelect={onTabSelect}
        onTabClose={onTabClose}
      />
      <EditorBreadcrumbs filename={filename} />
      <div style={{ flex: 1, minHeight: 0 }}>
        <Editor
          height="100%"
          theme="se-hub-dark"
          options={getEditorOptions() as MonacoEditor.IStandaloneEditorConstructionOptions}
          onMount={handleMount}
          loading={
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "var(--text-muted)",
                fontSize: 13,
                fontFamily: "ui-monospace, monospace",
                background: "var(--bg-elevated)",
              }}
            >
              Loading editor…
            </div>
          }
        />
      </div>
      <EditorStatusBar
        line={cursorPos.line}
        col={cursorPos.col}
        language={language}
        errors={diagnostics.errors}
        warnings={diagnostics.warnings}
      />
    </div>
  );
}

function computeRelativePath(fromDir: string, toFile: string): string {
  const fromParts = fromDir ? fromDir.split("/") : [];
  const toParts = toFile.split("/");
  const toDir = toParts.slice(0, -1);
  const toName = toParts[toParts.length - 1];

  let commonLen = 0;
  while (
    commonLen < fromParts.length &&
    commonLen < toDir.length &&
    fromParts[commonLen] === toDir[commonLen]
  ) {
    commonLen++;
  }

  const ups = fromParts.length - commonLen;
  const downs = toDir.slice(commonLen);
  const parts = [...Array(ups).fill(".."), ...downs, toName];
  const rel = parts.join("/");
  return rel.startsWith(".") ? rel : "./" + rel;
}
