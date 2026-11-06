export interface CollectionLink {
  title: string;
  url: string;
  description?: string;
}

export interface CollectionLinkGroup {
  id: string;
  label: string;
  links: CollectionLink[];
}

export interface Collection {
  slug: string;
  title: string;
  icon: string;
  accentColor: string;
  description: string;
  academySlugs: string[];
  relatedAcademySlugs: string[];
  jobTargetSlugs: string[];
  linkGroups: CollectionLinkGroup[];
}

const DISNEY: Collection = {
  slug: "disney",
  title: "Disney",
  icon: "🏰",
  accentColor: "#0063e5",
  description:
    "Everything built from Disney's streaming stack: the Flex BFF, the shared commerce library, and how Hulu and ESPN diverge from Disney+.",
  academySlugs: [
    "growth-life-client-api-mastery",
    "commerce-base-foundations",
    "hulu-architecture",
    "espn-architecture",
    "server-driven-ui-lab",
  ],
  relatedAcademySlugs: ["kubernetes-mastery", "datadog-mastery"],
  jobTargetSlugs: ["disney-staff-engineer"],
  linkGroups: [
    {
      id: "jira",
      label: "Jira",
      links: [
        {
          title: "GCIEX project",
          url: "https://deept.atlassian.net/projects/GCIEX",
          description: "Commerce growth tickets.",
        },
        {
          title: "GREAT project",
          url: "https://deept.atlassian.net/projects/GREAT",
          description: "Experimentation and analytics tickets.",
        },
      ],
    },
    {
      id: "confluence",
      label: "Confluence",
      links: [
        {
          title: "CGI space",
          url: "https://confluence.disney.com/spaces/CGI",
          description: "Commerce and growth documentation.",
        },
      ],
    },
    {
      id: "repos",
      label: "Repos",
      links: [
        {
          title: "growth-life-client-api",
          url: "https://github.twdcgrid.net/flex/growth-life-client-api",
          description: "Flex BFF behind the subscription screens.",
        },
        {
          title: "growth-life-client-templates",
          url: "https://github.twdcgrid.net/flex/growth-life-client-templates",
          description: "Screen templates rendered by Flex.",
        },
        {
          title: "cgi-web",
          url: "https://github.twdcgrid.net/cgi-client/cgi-web",
          description: "Commerce web apps for Disney+, Hulu and ESPN.",
        },
        {
          title: "Growth-Life-Orchestrator",
          url: "https://github.twdcgrid.net/glo/Growth-Life-Orchestrator",
          description: "GLO, the orchestrator Flex talks to.",
        },
        {
          title: "modh",
          url: "https://github.twdcgrid.net/cgi-client/modh",
        },
        {
          title: "asgard",
          url: "https://github.twdcgrid.net/CGX/asgard",
        },
      ],
    },
    {
      id: "dashboards",
      label: "Dashboards",
      links: [
        {
          title: "D+ Signup monitoring",
          url: "https://disneystreaming.datadoghq.com/dashboard/73r-7qq-9r3",
          description: "XD experimentation monitoring template.",
        },
        {
          title: "D+ In-Product Switch",
          url: "https://disneystreaming.datadoghq.com/dashboard/rhp-h4y-n36",
          description: "Disney+ switch flow.",
        },
        {
          title: "ESPN Signup",
          url: "https://disneystreaming.datadoghq.com/dashboard/spg-pqf-s6u",
          description: "ESPN signup funnel.",
        },
        {
          title: "ESPN Retention",
          url: "https://disneystreaming.datadoghq.com/dashboard/3nt-d4v-t4m",
          description: "ESPN retention flows.",
        },
        {
          title: "Hulu Retention",
          url: "https://disneystreaming.datadoghq.com/dashboard/md9-8xp-cww",
          description: "Hulu retention template.",
        },
        {
          title: "Hulu Account Management / Switch",
          url: "https://disneystreaming.datadoghq.com/dashboard/mwx-bru-hm7",
          description: "Hulu account management and switch.",
        },
      ],
    },
  ],
};

export const COLLECTIONS: Collection[] = [DISNEY];

export function findCollection(slug: string): Collection | undefined {
  return COLLECTIONS.find((collection) => collection.slug === slug);
}

export function resolveSlugs<T extends { slug: string }>(slugs: string[], items: T[]): T[] {
  return slugs.flatMap((slug) => {
    const match = items.find((item) => item.slug === slug);
    return match ? [match] : [];
  });
}
