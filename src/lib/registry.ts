import type { AcademyManifest } from "./types/academy";
import webFundamentals from "@/modules/web-fundamentals/manifest";
import typescriptMastery from "@/modules/typescript-mastery/manifest";
import reactDeepDive from "@/modules/react-deep-dive/manifest";
import pythonMastery from "@/modules/python-mastery/manifest";
import systemDesignAws from "@/modules/system-design-aws/manifest";
import expressBackend from "@/modules/express-backend/manifest";
import nodejsMastery from "@/modules/nodejs-mastery/manifest";

export const REGISTRY: AcademyManifest[] = [
  webFundamentals,
  typescriptMastery,
  reactDeepDive,
  pythonMastery,
  systemDesignAws,
  expressBackend,
  nodejsMastery,
];

export function findAcademy(slug: string): AcademyManifest | undefined {
  return REGISTRY.find((a) => a.slug === slug);
}
