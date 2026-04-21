"use client";

import dynamic from "next/dynamic";
import type { ReactChallenge } from "@/modules/react-interview/data/types";

const ChallengeEditor = dynamic(() => import("./ChallengeEditor"), { ssr: false });

export default function ChallengeEditorLoader({
  challenge,
  trackId,
}: {
  challenge: ReactChallenge;
  trackId: string;
}) {
  return <ChallengeEditor challenge={challenge} trackId={trackId} />;
}
