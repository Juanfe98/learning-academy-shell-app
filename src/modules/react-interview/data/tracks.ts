import type { InterviewTrack } from "./types";
import rendering from "./01-rendering";
import hooks from "./02-hooks";
import stateProps from "./03-state-props";
import dataStructures from "./04-data-structures";
import performance from "./05-performance";
import patterns from "./06-patterns";
import asyncEffects from "./07-async-effects";
import forms from "./08-forms";
import errorHandling from "./09-error-handling";
import testing from "./10-testing";
import concurrentModern from "./11-concurrent-modern";
import objectRendering from "./12-object-rendering";
import { ALL_TS_TOPICS } from "@/modules/typescript-interview/data";

export const reactTrack: InterviewTrack = {
  id: "react",
  title: "React",
  icon: "⚛️",
  description: "Components, hooks, performance, patterns — everything for a senior React role.",
  accentColor: "#06b6d4",
  topics: [rendering, hooks, stateProps, dataStructures, performance, patterns, asyncEffects, forms, errorHandling, testing, concurrentModern, objectRendering],
};

export const typescriptTrack: InterviewTrack = {
  id: "typescript",
  title: "TypeScript / JS",
  icon: "🔷",
  description: "Arrays, Maps, closures, async patterns, and practical TypeScript — the foundations behind every senior front-end role.",
  accentColor: "#3b82f6",
  topics: ALL_TS_TOPICS,
};

export const ALL_TRACKS: InterviewTrack[] = [
  reactTrack,
  typescriptTrack,
  {
    id: "css",
    title: "CSS & Layout",
    icon: "🎨",
    description: "Flexbox, Grid, specificity, animations, and responsive design.",
    accentColor: "#ec4899",
    comingSoon: true,
    topics: [],
  },
];
