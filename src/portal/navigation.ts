export const DASHBOARDS = [
  {
    id: "founder",
    title: "Founder Console",
    description:
      "Live identities, assets, revenue, opportunities, agents and mission health.",
  },
  {
    id: "gsip-registry",
    title: "GS-IP Registry Dashboard",
    description: "Asset ownership, lifecycle, licenses, and revenue receipts.",
  },
  {
    id: "identity",
    title: "Identity Dashboard",
    description: "People, agents, organizations, roles, and capabilities.",
  },
  {
    id: "executive",
    title: "Executive Dashboard",
    description: "Workspace evidence, priorities, and structural health.",
  },
  {
    id: "opportunities",
    title: "Opportunity Radar",
    description: "Traceable market sizing and opportunity signals.",
  },
  {
    id: "research",
    title: "Research Console",
    description: "Evidence capture, ICV reasoning, and graph research.",
  },
  {
    id: "factory",
    title: "GS-IP Factory",
    description: "Move owned assets from creation through expansion.",
  },
  {
    id: "pmd",
    title: "PMD Command Center",
    description: "Readiness and alignment across eight mission domains.",
  },
  {
    id: "compliance",
    title: "Compliance Console",
    description:
      "Auditable IP, privacy, governance, licensing, and risk checks.",
  },
  {
    id: "agents",
    title: "Agent Command Center",
    description: "Local agents produce evidence-based recommendations.",
  },
  {
    id: "umbrella",
    title: "Umbrella Planetary Dashboard",
    description: "Sourced indicators across planetary domains.",
  },
  {
    id: "mission",
    title: "Founder Mission Console",
    description: "Turn priorities into owned, trackable actions.",
  },
] as const;
export type DashboardId = (typeof DASHBOARDS)[number]["id"];
export const isDashboard = (value: string): value is DashboardId =>
  DASHBOARDS.some((item) => item.id === value);
