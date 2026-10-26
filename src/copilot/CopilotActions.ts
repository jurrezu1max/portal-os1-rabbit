import type { PortalSystem } from "../integration/system";
import { routeCommand, executePortalCommand } from "../portal/commands";
import { DASHBOARDS } from "../portal/navigation";
import type { CopilotReply } from "./CopilotContext";

export const COPILOT_SUGGESTIONS = [
  {
    title: "See the bigger picture",
    detail: "A live overview of your workspace",
    prompt: "Summarize my workspace",
    kind: "overview",
  },
  {
    title: "Find your next opportunity",
    detail: "Explore signals in your market data",
    prompt: "Show market opportunities",
    kind: "markets",
  },
  {
    title: "Put your agents to work",
    detail: "Get recommendations from five agents",
    prompt: "Run agents",
    kind: "agents",
  },
  {
    title: "Check your blind spots",
    detail: "Review compliance and open issues",
    prompt: "Review compliance",
    kind: "compliance",
  },
] as const;

/** Uses existing local systems only. Arbitrary text is never executed as code. */
export function runCopilotAction(
  prompt: string,
  system: PortalSystem,
  onFailure: (seeds: string[]) => void,
): CopilotReply {
  const input = prompt.trim();
  if (!input || input.length > 2000)
    throw new Error("Enter a message between 1 and 2,000 characters.");
  const state = system.getSnapshot();
  if (/^(summarize my workspace|workspace overview|hello|hi)$/i.test(input)) {
    return {
      text: `${state.workspace.name} · ${state.workspace.project}\n\nYour workspace has ${state.identities.length} identities, ${state.assets.length} registered assets and ${state.opportunities.length} market opportunities. Your architecture contains ${state.architecture.nodes} subsystems and ${state.architecture.edges} connections.\n\n${state.workspace.missions.length} mission actions · ${state.workspace.initiatives.length} PMD initiatives · ${state.issues.length} integration issues.\n\n${state.workspace.goals.length ? `Your goals: ${state.workspace.goals.join("; ")}` : "Add goals in Executive Dashboard to give your work more context."}`,
      source: "Live Portal system · workspace, identity & GS-IP registries",
      dashboard: "founder",
    };
  }
  if (
    /^(show market opportunities|market opportunities|find opportunities)$/i.test(
      input,
    )
  ) {
    const opportunities = [...state.opportunities].sort(
      (a, b) => b.opportunityScore - a.opportunityScore,
    );
    return {
      text: opportunities.length
        ? `Opportunities ranked by the existing market scoring method:\n\n${opportunities
            .slice(0, 5)
            .map(
              (o, i) =>
                `${i + 1}. ${o.name} — ${o.opportunityScore.toFixed(2)}/100\nSource: ${o.source} · ${o.observedAt}`,
            )
            .join(
              "\n\n",
            )}\n\nScores are evidence-based heuristics, not predictions of success.`
        : "No market evidence yet. Add sourced market observations in Opportunity Radar to compare opportunities. Copilot will use those observations here.",
      source: "Live Portal system · market opportunity evaluator",
      dashboard: "opportunities",
    };
  }
  if (/^(review compliance|check compliance)$/i.test(input)) {
    return {
      text: `Compliance status: ${state.compliance.status}.\n\n${state.compliance.reviewCount} decisions need review. ${state.compliance.unreviewedAssets.length} registered assets have no audit.\n\n${state.issues.length ? `Integration issues:\n${state.issues.map((issue) => `• ${issue}`).join("\n")}` : "No integration issues reported."}\n\nOpen Compliance Console to inspect the evidence and record audit decisions.`,
      source: "Live Portal system · compliance bridge",
      dashboard: "compliance",
    };
  }
  if (/^run agents(?:\s*:\s*.+)?$/i.test(input)) {
    const results = system.runAgents(
      input.replace(/^run agents\s*:?\s*/i, "") ||
        "Review workspace priorities",
    );
    return {
      text: Object.entries(results)
        .map(
          ([name, result]) =>
            `${name.charAt(0).toUpperCase() + name.slice(1)} agent · ${result.status}\n${result.reasoning.join("\n")}\nNext: ${result.actions.join("; ")}`,
        )
        .join("\n\n"),
      source: "Portal agent bridge · local evidence-based recommendations",
      dashboard: "agents",
    };
  }
  if (/^(help|what can i ask)\??$/i.test(input)) {
    return {
      text: `Try a workspace prompt:\n• Summarize my workspace\n• Show market opportunities\n• Review compliance\n• Run agents: review my priorities\n\nOpen any dashboard by name, such as “Open Founder Console”.\n\nArchitecture commands:\n• Compute Identity Invariant\n• Create Memory Cluster\n• Connect Memory Cluster to Core Executive\n• Save snapshot v1\n• Run failure simulation on Core Executive\n\nThis Copilot uses local commands and workspace evidence. Open-ended model conversation is not connected.`,
      source: "Portal Copilot · command guide",
    };
  }
  if (/^summarize my architecture$/i.test(input)) {
    return {
      text: `Your live architecture has ${state.architecture.nodes} subsystems and ${state.architecture.edges} connections. Ask “Compute Identity Invariant” for a measured structural summary.`,
      source: "Live Portal system · architecture",
    };
  }
  const command = routeCommand(input);
  if (command.kind === "navigate") {
    const dashboard = DASHBOARDS.find((d) => d.id === command.page)!;
    return {
      text: `${dashboard.title}\n\n${dashboard.description}`,
      source: "Portal navigation",
      dashboard: command.page,
    };
  }
  return {
    text: executePortalCommand(input, () => {}, null, onFailure),
    source: "Existing Portal workspace command engine",
  };
}
