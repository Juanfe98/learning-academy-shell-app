export interface FileEntry {
  content: string;
  language: "jsx" | "js" | "css";
  seed: boolean;
}

export type FileMap = Record<string, FileEntry>;

export type TreeNode =
  | { kind: "file"; path: string; name: string; language: FileEntry["language"]; seed: boolean }
  | { kind: "folder"; path: string; name: string; children: TreeNode[] };

export function buildTree(fileMap: FileMap, folders: string[]): TreeNode[] {
  const root: TreeNode[] = [];
  const folderMap = new Map<string, TreeNode & { kind: "folder" }>();

  // Ensure all explicit folders exist in the map
  const allFolderPaths = new Set<string>(folders);
  for (const path of Object.keys(fileMap)) {
    const parts = path.replace(/^\.\//, "").split("/");
    for (let i = 1; i < parts.length; i++) {
      allFolderPaths.add("./" + parts.slice(0, i).join("/"));
    }
  }

  // Sort folder paths so parents are created before children
  const sortedFolders = [...allFolderPaths].sort();
  for (const folderPath of sortedFolders) {
    const name = folderPath.split("/").pop() ?? folderPath;
    const parentPath = folderPath.split("/").slice(0, -1).join("/") || ".";
    const node: TreeNode & { kind: "folder" } = { kind: "folder", path: folderPath, name, children: [] };
    folderMap.set(folderPath, node);
    if (parentPath === ".") {
      root.push(node);
    } else {
      folderMap.get(parentPath)?.children.push(node);
    }
  }

  // Insert files
  for (const [path, entry] of Object.entries(fileMap)) {
    const parts = path.replace(/^\.\//, "").split("/");
    const name = parts[parts.length - 1];
    const parentPath =
      parts.length === 1 ? "." : "./" + parts.slice(0, -1).join("/");
    const node: TreeNode = { kind: "file", path, name, language: entry.language, seed: entry.seed };
    if (parentPath === ".") {
      root.push(node);
    } else {
      folderMap.get(parentPath)?.children.push(node);
    }
  }

  return sortNodes(root);
}

function sortNodes(nodes: TreeNode[]): TreeNode[] {
  return [...nodes].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  }).map(n => n.kind === "folder" ? { ...n, children: sortNodes(n.children) } : n);
}

export function validateFileName(name: string, siblings: string[]): string | null {
  if (!name.trim()) return "Name cannot be empty";
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) return "Only letters, numbers, dots, hyphens, underscores";
  if (siblings.map(s => s.toLowerCase()).includes(name.toLowerCase())) return `"${name}" already exists`;
  return null;
}

/**
 * Returns candidate resolution paths for `importId` imported from `fromFile`.
 * All paths use the `./` prefix matching FileMap keys.
 */
export function normalizePath(importId: string, fromFile: string): string[] {
  // Get directory of fromFile
  const fromDir = fromFile.lastIndexOf("/") > 0
    ? fromFile.substring(0, fromFile.lastIndexOf("/"))
    : ".";

  const raw = fromDir + "/" + importId;
  const parts = raw.split("/");
  const stack: string[] = [];
  for (const p of parts) {
    if (p === "" || p === ".") continue;
    if (p === "..") { stack.pop(); }
    else stack.push(p);
  }
  const base = "./" + stack.join("/");
  return [base, base + ".jsx", base + ".js", base + "/index.jsx", base + "/index.js"];
}

export function buildSeedFileMap(files: { filename: string; content: string; language: FileEntry["language"] }[]): FileMap {
  const map: FileMap = {};
  for (const f of files) {
    map["./" + f.filename] = { content: f.content, language: f.language, seed: true };
  }
  return map;
}

export function getDepth(path: string): number {
  return path.replace(/^\.\//, "").split("/").length;
}
