import type { LearningModule, Lesson, Challenge } from "./types";
import { htmlFoundations, explanations as htmlExpl } from "./01-html-foundations";
import { formsAccessibility, explanations as formsExpl } from "./02-forms-accessibility";
import { cssFoundations, explanations as cssExpl } from "./03-css-foundations";
import { displayPositioning, explanations as displayExpl } from "./04-display-positioning";
import { flexbox, explanations as flexExpl } from "./05-flexbox";
import { cssGrid, explanations as gridExpl } from "./06-css-grid";
import { responsiveDesign, explanations as responsiveExpl } from "./07-responsive-design";
import { visualUI, explanations as visualExpl } from "./08-visual-ui";
import { transitionsAnimations, explanations as transitionsExpl } from "./09-transitions-animations";
import { interviewChallenges, explanations as interviewExpl } from "./10-interview-challenges";

export type { LearningModule, Lesson, Challenge };
export type { Difficulty, CodeExample, PracticeTask } from "./types";

export const WF_MODULES: LearningModule[] = [
  htmlFoundations,
  formsAccessibility,
  cssFoundations,
  displayPositioning,
  flexbox,
  cssGrid,
  responsiveDesign,
  visualUI,
  transitionsAnimations,
  interviewChallenges,
];

const allExplanations: Record<string, () => React.ReactNode> = {
  ...htmlExpl,
  ...formsExpl,
  ...cssExpl,
  ...displayExpl,
  ...flexExpl,
  ...gridExpl,
  ...responsiveExpl,
  ...visualExpl,
  ...transitionsExpl,
  ...interviewExpl,
};

export function getModule(id: string): LearningModule | undefined {
  return WF_MODULES.find((m) => m.id === id);
}

export function getLesson(id: string): Lesson | undefined {
  for (const mod of WF_MODULES) {
    const lesson = mod.lessons.find((l) => l.id === id);
    if (lesson) return lesson;
  }
  return undefined;
}

export function getChallenge(id: string): Challenge | undefined {
  for (const mod of WF_MODULES) {
    const challenge = mod.challenges.find((c) => c.id === id);
    if (challenge) return challenge;
  }
  return undefined;
}

export function getLessonExplanation(id: string): (() => React.ReactNode) | undefined {
  return allExplanations[id];
}

export function getLessonsForModule(moduleId: string): Lesson[] {
  return getModule(moduleId)?.lessons ?? [];
}

export function getChallengesForModule(moduleId: string): Challenge[] {
  return getModule(moduleId)?.challenges ?? [];
}

export function getPrevNextLesson(lessonId: string): {
  prev: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
} {
  for (const mod of WF_MODULES) {
    const idx = mod.lessons.findIndex((l) => l.id === lessonId);
    if (idx === -1) continue;

    const prev = idx > 0 ? { id: mod.lessons[idx - 1].id, title: mod.lessons[idx - 1].title } : null;
    const next = idx < mod.lessons.length - 1 ? { id: mod.lessons[idx + 1].id, title: mod.lessons[idx + 1].title } : null;
    return { prev, next };
  }
  return { prev: null, next: null };
}
