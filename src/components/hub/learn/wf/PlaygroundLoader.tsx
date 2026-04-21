"use client";

import dynamic from "next/dynamic";

const PlaygroundPage = dynamic(() => import("./PlaygroundPage"), { ssr: false });

export default function PlaygroundLoader({ challengeId }: { challengeId?: string }) {
  return <PlaygroundPage challengeId={challengeId} />;
}
