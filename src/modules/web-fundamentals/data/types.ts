export type Difficulty = "easy" | "medium" | "hard";

export interface CodeExample {
  title: string;
  description?: string;
  html?: string;
  css?: string;
  js?: string;
}

export interface PracticeTask {
  description: string;
  hint?: string;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
  learningObjectives: string[];
  codeExamples: CodeExample[];
  commonMistakes: string[];
  interviewTips: string[];
  practiceTasks: PracticeTask[];
}

export interface Challenge {
  id: string;
  moduleId: string;
  title: string;
  difficulty: Difficulty;
  description: string;
  requirements: string[];
  starterHtml?: string;
  starterCss?: string;
  expectedResult: string;
  hints: string[];
  bonusTasks: string[];
  conceptsCovered: string[];
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  icon: string;
  order: number;
  estimatedHours: number;
  lessons: Lesson[];
  challenges: Challenge[];
}
