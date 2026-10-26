import type { PortalSystemState } from "../../integration/types";
import { Stat, Rows, Empty } from "../../portal/DashboardUI";
import { Panel } from "../UI";
export default function FounderConsole({
  state,
}: {
  state: PortalSystemState;
}) {
  const complete = state.workspace.missions.filter(
    (mission) => mission.status === "complete",
  ).length;
  return (
    <section aria-label="Founder system overview" className="portal-dashboard">
      <div className="portal-stats">
        <Stat
          title="Total Identities"
          value={String(state.identities.length)}
          detail="Live Identity Registry"
        />
        <Stat
          title="Total Assets"
          value={String(state.assets.length)}
          detail={`${state.workspace.assets.length} additional legacy factory records`}
        />
        <Stat
          title="Revenue"
          value={`$${state.revenue.toFixed(2)}`}
          detail="Recorded USD receipts; annual factory estimates excluded"
        />
        <Stat
          title="Opportunities"
          value={String(state.opportunities.length)}
          detail="Computed from sourced market inputs"
        />
        <Stat
          title="Agent Status"
          value={`${state.agents.filter((agent) => agent.status === "ready-for-review").length} ready`}
          detail={`${state.agents.filter((agent) => agent.status === "stale").length} stale · ${state.agents.filter((agent) => agent.status === "idle").length} idle`}
        />
        <Stat
          title="Compliance Status"
          value={state.compliance.status}
          detail={`${state.compliance.reviewCount} findings · ${state.compliance.unreviewedAssets.length} unaudited assets`}
        />
        <Stat
          title="Mission Status"
          value={`${complete}/${state.workspace.missions.length}`}
          detail="Completed owned actions"
        />
        <Stat
          title="Research / MAX-SIM"
          value={String(state.workspace.observations.length)}
          detail={`Sourced observations · ${state.architecture.nodes} graph nodes · ${state.architecture.edges} connections`}
        />
      </div>
      <Panel title="Founder priorities" eyebrow="SHARED SYSTEM STATE">
        {state.workspace.missions.length ? (
          <Rows headers={["Mission", "Owner", "Status"]}>
            {state.workspace.missions.map((mission) => (
              <tr key={mission.id}>
                <th scope="row">{mission.title}</th>
                <td>{mission.owner}</td>
                <td>{mission.status}</td>
              </tr>
            ))}
          </Rows>
        ) : (
          <Empty>
            No mission actions yet. Run agents and accept a recommendation, or
            add an action in Founder Mission Console.
          </Empty>
        )}
        <div className="button-row">
          <a className="button" href="#/portal/mission">
            Open mission plan
          </a>
          <a className="button" href="#/portal/agents">
            Open agents
          </a>
          <a className="button" href="#/portal/research">
            Open research
          </a>
          <a className="button" href="#/workbench/Topology">
            Open MAX-SIM
          </a>
        </div>
      </Panel>
    </section>
  );
}
