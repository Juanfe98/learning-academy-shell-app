import { notFound } from "next/navigation";
import { getChallengeBySlug } from "@/lib/challenges/registry";
import PlaygroundPage from "./PlaygroundPage";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const challenge = getChallengeBySlug(slug);
  if (!challenge) notFound();
  return <PlaygroundPage key={challenge.slug} challenge={challenge} />;
}
