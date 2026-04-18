import type { ComponentType } from "react";

export interface AcademyManifest {
  slug: string;
  title: string;
  description: string;
  version: string;
  icon: string;
  accentColor: string;
  routes: AcademyRoute[];
  learningPath: string[];
}

export interface AcademyRoute {
  slug: string;
  title: string;
  component: ComponentType;
  estimatedMinutes?: number;
  tags?: string[];
  order: number;
}
