import { notFound } from "next/navigation";
import { getChallengeBySlug } from "@/lib/challenges/registry";
import PlaygroundPage from "./PlaygroundPage";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function Page({ params }: Props) {
  console.log("Rendering the Playground Page");
  const { slug } = await params;
  const challenge = getChallengeBySlug(slug);
  console.log("slug -> ", slug);
  console.log("channel -> ", challenge);
  if (!challenge) notFound();
  return <PlaygroundPage key={challenge.slug} challenge={challenge} />;
}
