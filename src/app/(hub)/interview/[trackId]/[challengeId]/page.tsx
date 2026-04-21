import { notFound } from "next/navigation";
import ChallengeEditorLoader from "@/components/hub/interview/ChallengeEditorLoader";
import { getChallenge, getTrack } from "@/modules/react-interview/data";

interface Props {
  params: Promise<{ trackId: string; challengeId: string }>;
}

export default async function ChallengePage({ params }: Props) {
  const { trackId, challengeId } = await params;
  const track = getTrack(trackId);
  const challenge = getChallenge(challengeId);
  if (!track || !challenge) notFound();
  return <ChallengeEditorLoader challenge={challenge} trackId={trackId} />;
}
