import type { ReactNode } from "react";

interface ArticleTableProps {
  children: ReactNode;
  caption?: string;
  minWidth?: number;
}

export default function ArticleTable({
  children,
  caption,
  minWidth = 760,
}: ArticleTableProps) {
  return (
    <figure className="article-table">
      {caption && <figcaption className="article-table__caption">{caption}</figcaption>}
      <div className="article-table__scroll" style={{ ["--article-table-min-width" as string]: `${minWidth}px` }}>
        {children}
      </div>
    </figure>
  );
}
