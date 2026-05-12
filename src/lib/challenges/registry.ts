import type { Challenge } from "./types";
import reactCounter from "@/modules/challenges/react-counter";
import reactEmployeeDirectory from "@/modules/challenges/react-employee-directory";
import reactTypedCounter from "@/modules/challenges/react-typed-counter";
import tsOopShapes from "@/modules/challenges/ts-oop-shapes";

export const CHALLENGE_REGISTRY: Challenge[] = [reactCounter, reactTypedCounter, tsOopShapes, reactEmployeeDirectory];

export function getChallengeBySlug(slug: string): Challenge | undefined {
  return CHALLENGE_REGISTRY.find((c) => c.slug === slug);
}
