interface PathOverviewPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PathOverviewPage({
  params,
}: PathOverviewPageProps) {
  const { slug } = await params;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold capitalize">{slug} — Path Overview</h1>
      <p className="mt-2 text-gray-500">
        Module list and progress will appear here.
      </p>
    </div>
  );
}
