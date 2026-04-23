import type { ReactChallenge, ChallengeTopic, InterviewTrack } from "./types";
import rendering from "./01-rendering";
import hooks from "./02-hooks";
import stateProps from "./03-state-props";
import dataStructures from "./04-data-structures";
import performance from "./05-performance";
import patterns from "./06-patterns";
import asyncEffects from "./07-async-effects";
import forms from "./08-forms";
import errorHandling from "./09-error-handling";
import { ALL_TRACKS as _ALL_TRACKS } from "./tracks";

export * from "./types";
export { ALL_TRACKS } from "./tracks";

export const ALL_TOPICS: ChallengeTopic[] = [
  rendering,
  hooks,
  stateProps,
  dataStructures,
  performance,
  patterns,
  asyncEffects,
  forms,
  errorHandling,
];

export const ALL_CHALLENGES: ReactChallenge[] = _ALL_TRACKS.flatMap((t) =>
  t.topics.flatMap((tp) => tp.challenges)
);

export function getTopic(id: string): ChallengeTopic | undefined {
  return ALL_TOPICS.find((t) => t.id === id);
}

export function getChallenge(id: string): ReactChallenge | undefined {
  return ALL_CHALLENGES.find((c) => c.id === id);
}

export function getTrack(id: string): InterviewTrack | undefined {
  return _ALL_TRACKS.find((t) => t.id === id);
}
