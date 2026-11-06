export type AcademyCategory =
  | "fundamentals"
  | "frontend"
  | "backend-systems"
  | "platform-ops"
  | "disney";

export interface AcademyCategoryMeta {
  id: AcademyCategory;
  label: string;
}

export const ACADEMY_CATEGORIES: AcademyCategoryMeta[] = [
  { id: "fundamentals", label: "Fundamentals" },
  { id: "frontend", label: "Frontend" },
  { id: "backend-systems", label: "Backend & Systems" },
  { id: "platform-ops", label: "Platform & Ops" },
  { id: "disney", label: "Disney" },
];

export interface CategoryGroup<T> {
  id: AcademyCategory;
  label: string;
  academies: T[];
}

export function groupAcademiesByCategory<T extends { category: AcademyCategory }>(
  academies: T[],
): CategoryGroup<T>[] {
  return ACADEMY_CATEGORIES.map(({ id, label }) => ({
    id,
    label,
    academies: academies.filter((academy) => academy.category === id),
  })).filter((group) => group.academies.length > 0);
}
