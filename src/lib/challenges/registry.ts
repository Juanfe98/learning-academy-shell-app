import type { Challenge } from "./types";
import reactCounter from "@/modules/challenges/react-counter";

export const CHALLENGE_REGISTRY: Challenge[] = [reactCounter];

export function getChallengeBySlug(slug: string): Challenge | undefined {
  return CHALLENGE_REGISTRY.find((c) => c.slug === slug);
}
