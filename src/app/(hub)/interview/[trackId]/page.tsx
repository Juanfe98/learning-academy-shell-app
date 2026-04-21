import { notFound } from "next/navigation";
import ChallengeBrowser from "@/components/hub/interview/ChallengeBrowser";
import { getTrack } from "@/modules/react-interview/data";

interface Props {
  params: Promise<{ trackId: string }>;
}

export default async function TrackPage({ params }: Props) {
  const { trackId } = await params;
  const track = getTrack(trackId);
  if (!track || track.comingSoon) notFound();
  return <ChallengeBrowser track={track} />;
}
