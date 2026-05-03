import type { AcademyGroup } from "./types/academy";

interface GroupableAcademy {
  learningPath: string[];
  groups?: AcademyGroup[];
}

export function getAcademyGroups<T extends GroupableAcademy>(academy: T): AcademyGroup[] {
  if (academy.groups && academy.groups.length > 0) return academy.groups;

  return [
    {
      id: "all-modules",
      title: "All Modules",
      routeSlugs: academy.learningPath,
    },
  ];
}
