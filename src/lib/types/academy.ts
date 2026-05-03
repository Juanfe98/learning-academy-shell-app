import type { ComponentType } from "react";

export interface TocItem {
  id: string;
  title: string;
  level: 2 | 3;
}

export interface AcademyModule {
  default: ComponentType;
  toc?: TocItem[];
}

export interface AcademyManifest {
  slug: string;
  title: string;
  description: string;
  version: string;
  icon: string;
  accentColor: string;
  routes: AcademyRoute[];
  learningPath: string[];
  groups?: AcademyGroup[];
  totalEstimatedMinutes: number;
}

export interface AcademyRoute {
  slug: string;
  title: string;
  component: () => Promise<AcademyModule>;
  estimatedMinutes: number;
  tags: string[];
  order: number;
}

export interface AcademyGroup {
  id: string;
  title: string;
  description?: string;
  routeSlugs: string[];
}
