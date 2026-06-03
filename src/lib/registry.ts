import type { AcademyManifest } from "./types/academy";
import webFundamentals from "@/modules/web-fundamentals/manifest";
import typescriptMastery from "@/modules/typescript-mastery/manifest";
import reactDeepDive from "@/modules/react-deep-dive/manifest";
import pythonMastery from "@/modules/python-mastery/manifest";
import systemDesignAws from "@/modules/system-design-aws/manifest";
import expressBackend from "@/modules/express-backend/manifest";
import nodejsMastery from "@/modules/nodejs-mastery/manifest";
import nextjsMastery from "@/modules/nextjs-mastery/manifest";
import indeedSrReactNextjs from "@/modules/indeed-senior-react-nextjs-11802/manifest";
import disneyStaffEngineer from "@/modules/disney-staff-engineer/manifest";
import godaddySeniorSdeAi from "@/modules/godaddy-senior-sde-ai/manifest";
import webComponents from "@/modules/web-components/manifest";

export const REGISTRY: AcademyManifest[] = [
  webFundamentals,
  typescriptMastery,
  reactDeepDive,
  pythonMastery,
  systemDesignAws,
  expressBackend,
  nodejsMastery,
  nextjsMastery,
  indeedSrReactNextjs,
  disneyStaffEngineer,
  godaddySeniorSdeAi,
  webComponents,
];

export function findAcademy(slug: string): AcademyManifest | undefined {
  return REGISTRY.find((a) => a.slug === slug);
}
