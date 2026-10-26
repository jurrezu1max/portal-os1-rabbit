import { useState } from "react";
import { Panel, number } from "../components/UI";
import { createId } from "../engine/id";
import { RecordForm } from "./forms";
import { sessionId, type PortalWorkspace } from "./workspace";
import { Empty } from "./DashboardUI";
import { AGENTS } from "../agents/registry";
import type { AgentResult } from "../agents/contracts";
import { AGENT_REGISTRY } from "../icv/identity";
import { createContext } from "../icv/context";
import { createMission } from "../mission/planning";
export function Agents({
  data,
  update,
  onRun,
  sharedResults,
}: {
  data: PortalWorkspace;
  update: (change: (w: PortalWorkspace) => PortalWorkspace) => void;
  onRun?: (prompt: string) => Record<string, AgentResult>;
  sharedResults?: Record<string, AgentResult>;
}) {
  const [localResults, setResults] = useState<Record<string, AgentResult>>({});
  const results = sharedResults ?? localResults;
  const [message, setMessage] = useState("");
  return (
    <>
      <Panel
        title="Run the agent network"
        eyebrow="LOCAL DETERMINISTIC PLANNERS"
      >
        <RecordForm
          fields={[
            { name: "prompt", label: "Mission prompt", type: "textarea" },
          ]}
          submit="Run agents"
          onSubmit={(v) => {
            const input = {
              context: createContext(
                sessionId,
                data.name,
                data.project,
                data.goals,
                data.profile,
              ),
              prompt: v.prompt,
              evidence: data.observations,
              markets: data.markets,
              compliance: data.compliance,
              missions: data.missions,
            };
            setResults(
              onRun
                ? onRun(v.prompt)
                : Object.fromEntries(
                    AGENT_REGISTRY.map(({ id }) => [id, AGENTS[id](input)]),
                  ),
            );
          }}
        />
        <p className="note">
          Confidence measures evidence completeness, not factual certainty.
          Agents recommend actions; accepting a recommendation records a mission
          for human execution. Results reflect the workspace at run time.
        </p>
      </Panel>
      <p role="status">{message}</p>
      <div className="portal-cards">
        {AGENT_REGISTRY.map((agent) => (
          <Panel title={`${agent.id} agent`} key={agent.id}>
            <p className="note">{agent.capabilities.join(", ")}</p>
            {results[agent.id] ? (
              <>
                <p>
                  {results[agent.id].status} · confidence{" "}
                  {number(results[agent.id].confidence * 100, 0)}%
                </p>
                {results[agent.id].reasoning.map((r, i) => (
                  <p key={i}>{r}</p>
                ))}
                {results[agent.id].actions.map((a, i) => (
                  <div className="portal-record" key={i}>
                    <p>{a}</p>
                    <button
                      className="button small"
                      onClick={() => {
                        try {
                          update((w) => ({
                            ...w,
                            missions: [
                              ...w.missions,
                              createMission(
                                createId(),
                                a,
                                data.profile.name,
                                "normal",
                              ),
                            ],
                          }));
                          setMessage(
                            "Recommendation recorded in Founder Mission Console.",
                          );
                        } catch (e) {
                          setMessage(
                            e instanceof Error
                              ? e.message
                              : "Unable to record action.",
                          );
                        }
                      }}
                    >
                      Record mission action
                    </button>
                  </div>
                ))}
              </>
            ) : (
              <Empty>Run the network to produce recommendations.</Empty>
            )}
          </Panel>
        ))}
      </div>
    </>
  );
}
