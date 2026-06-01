import type { Challenge } from "./types";
import reactCounter from "@/modules/challenges/react-counter";
import reactEmployeeDirectory from "@/modules/challenges/react-employee-directory";
import reactTypedCounter from "@/modules/challenges/react-typed-counter";
import tsOopShapes from "@/modules/challenges/ts-oop-shapes";
import reactFilterSortForm from "@/modules/challenges/react-filter-sort-form";
import reactCascadingDropdowns from "@/modules/challenges/react-cascading-dropdowns";
import reactUseFilterHook from "@/modules/challenges/react-use-filter-hook";
import reactMemoization from "@/modules/challenges/react-memoization";
import reactTailwindForm from "@/modules/challenges/react-tailwind-form";
import reactProductCatalogCards from "@/modules/challenges/react-product-catalog-cards";
import reactUserDirectoryTable from "@/modules/challenges/react-user-directory-table";
import reactMovieBrowser from "@/modules/challenges/react-movie-browser";
import reactGithubRepoExplorer from "@/modules/challenges/react-github-repo-explorer";
import reactJobBoard from "@/modules/challenges/react-job-board";
import reactCryptoPriceTracker from "@/modules/challenges/react-crypto-price-tracker";
import reactNewsFeed from "@/modules/challenges/react-news-feed";
import reactOrderHistoryTable from "@/modules/challenges/react-order-history-table";
import reactGraphqlTeamDirectory from "@/modules/challenges/react-graphql-team-directory";
import reactBookLibraryMultifilter from "@/modules/challenges/react-book-library-multifilter";
import reactCountryExplorer from "@/modules/challenges/react-country-explorer";

export const CHALLENGE_REGISTRY: Challenge[] = [
  reactCounter,
  reactTypedCounter,
  tsOopShapes,
  reactEmployeeDirectory,
  reactFilterSortForm,
  reactCascadingDropdowns,
  reactUseFilterHook,
  reactMemoization,
  reactTailwindForm,
  reactProductCatalogCards,
  reactUserDirectoryTable,
  reactMovieBrowser,
  reactGithubRepoExplorer,
  reactJobBoard,
  reactCryptoPriceTracker,
  reactNewsFeed,
  reactOrderHistoryTable,
  reactGraphqlTeamDirectory,
  reactBookLibraryMultifilter,
  reactCountryExplorer,
];

export function getChallengeBySlug(slug: string): Challenge | undefined {
  return CHALLENGE_REGISTRY.find((c) => c.slug === slug);
}
