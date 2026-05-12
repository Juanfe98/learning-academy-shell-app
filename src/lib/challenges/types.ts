export interface ChallengeFile {
  filename: string;
  language: "jsx" | "js" | "css" | "ts" | "tsx";
  content: string;
  readOnly?: boolean;
}

export interface Challenge {
  slug: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  tags: string[];
  environment: "react-js" | "react-ts" | "node-ts";
  files: ChallengeFile[];
  entryFile: string;
  tests?: string; // TypeScript test file content (describe/it/expect)
  problemStatement?: string; // full markdown spec shown in the challenge panel
}

export interface TestResult {
  description: string;
  pass: boolean;
  error?: string;
}

export interface ConsoleEntry {
  id: string;
  method: "log" | "warn" | "error" | "info";
  args: string[];
  timestamp: number;
}

export interface ConsoleMessage {
  type: "console";
  method: ConsoleEntry["method"];
  args: string[];
  timestamp: number;
}

export interface ErrorMessage {
  type: "error";
  message: string;
  stack?: string;
}
