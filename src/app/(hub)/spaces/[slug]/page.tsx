import { notFound } from "next/navigation";
import CollectionView from "@/components/hub/collections/CollectionView";
import { COLLECTIONS, findCollection, resolveSlugs } from "@/lib/collections";
import { HUB_ACADEMIES } from "@/lib/hub-academies";
import { JOB_TARGETS } from "@/lib/job-targets";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return COLLECTIONS.map((collection) => ({ slug: collection.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const collection = findCollection(slug);
  if (!collection) return {};
  return { title: `${collection.title} — SE Hub` };
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  const collection = findCollection(slug);
  if (!collection) notFound();

  return (
    <CollectionView
      collection={collection}
      academies={resolveSlugs(collection.academySlugs, HUB_ACADEMIES)}
      relatedAcademies={resolveSlugs(collection.relatedAcademySlugs, HUB_ACADEMIES)}
      jobTargets={resolveSlugs(collection.jobTargetSlugs, JOB_TARGETS).map((job) => ({
        slug: job.slug,
        company: job.company,
        role: job.role,
        status: job.status,
        accentColor: job.accentColor,
      }))}
    />
  );
}
