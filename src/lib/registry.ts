import type { AcademyManifest } from "./types/academy";
import webFundamentals from "@/modules/mock-academy/manifest";

export const REGISTRY: AcademyManifest[] = [webFundamentals];

export function findAcademy(slug: string): AcademyManifest | undefined {
  return REGISTRY.find((a) => a.slug === slug);
}
