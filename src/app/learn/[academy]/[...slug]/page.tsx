interface ContentViewerPageProps {
  params: Promise<{ academy: string; slug: string[] }>;
}

export default async function ContentViewerPage({
  params,
}: ContentViewerPageProps) {
  const { academy, slug } = await params;

  return (
    <div className="container mx-auto px-4 py-8">
      <nav className="text-sm text-gray-500 mb-6">
        <span>Hub</span> / <span className="capitalize">{academy}</span> /{" "}
        <span>{slug.join(" / ")}</span>
      </nav>
      <h1 className="text-3xl font-bold">Content Viewer — Placeholder</h1>
      <p className="mt-2 text-gray-500">
        Academy: <code>{academy}</code> | Route: <code>{slug.join("/")}</code>
      </p>
    </div>
  );
}
