import type { Challenge } from "./types";
import reactCounter from "@/modules/challenges/react-counter";
import reactTypedCounter from "@/modules/challenges/react-typed-counter";
import tsOopShapes from "@/modules/challenges/ts-oop-shapes";

export const CHALLENGE_REGISTRY: Challenge[] = [reactCounter, reactTypedCounter, tsOopShapes];

export function getChallengeBySlug(slug: string): Challenge | undefined {
  return CHALLENGE_REGISTRY.find((c) => c.slug === slug);
}
