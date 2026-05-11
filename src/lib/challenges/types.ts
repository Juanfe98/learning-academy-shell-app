export interface ChallengeFile {
  filename: string;
  language: "jsx" | "js" | "css";
  content: string;
  readOnly?: boolean;
}

export interface Challenge {
  slug: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  tags: string[];
  environment: "react-js";
  files: ChallengeFile[];
  entryFile: string;
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
