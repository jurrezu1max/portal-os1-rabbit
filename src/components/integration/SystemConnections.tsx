import { useState } from "react";
import { portalSystem, type PortalSystem } from "../../integration/system";
import { usePortalSystem } from "../../integration/usePortalSystem";
import { identityAssets } from "../../integration/identityBridge";
import { marketConnections } from "../../integration/marketBridge";
import { AGENT_IDS, type AgentId } from "../../icv/identity";
import type { DashboardId } from "../../portal/navigation";
import { RecordForm } from "../../portal/forms";
import { Rows, Empty } from "../../portal/DashboardUI";
import { Compliance } from "../../portal/ComplianceConsole";
import { download } from "../../engine/io";
import { Panel } from "../UI";
import FounderConsole from "./FounderConsole";
import WorkerPanel from "./WorkerPanel";
export default function SystemConnections({
  page,
  system = portalSystem,
}: {
  page: DashboardId;
  system?: PortalSystem;
}) {
  const state = usePortalSystem(system);
  const [notice, setNotice] = useState("");
  const action = (fn: () => void) => {
    try {
      fn();
      setNotice("System connection updated.");
    } catch (error) {
      setNotice(
        `Error: ${error instanceof Error ? error.message : "Operation failed."}`,
      );
    }
  };
  const markets = state.workspace.markets.map((item) => ({
    value: item.id,
    label: item.name,
  }));
  const initiatives = state.workspace.initiatives.map((item) => ({
    value: item.id,
    label: item.title,
  }));
  const assets = state.assets.map((item) => ({
    value: item.id,
    label: item.title,
  }));
  const agents = state.identities
    .filter((identity) => identity.type === "agent")
    .map((identity) => ({ value: identity.id, label: identity.name }));
  const summary = ["executive", "founder", "mission"].includes(page);
  const marketPage = [
    "opportunities",
    "pmd",
    "factory",
    "gsip-registry",
  ].includes(page);
  const agentPage = ["pmd", "agents", "compliance"].includes(page);
  return (
    <section
      className="portal-dashboard system-connections"
      aria-label="Connected Portal system"
    >
      {summary && <FounderConsole state={state} />}
      {state.error && (
        <div className="notice-banner" role="alert">
          <span>{state.error}</span>
          {state.recovery !== null && (
            <button
              className="button"
              onClick={() =>
                download(
                  state.recovery!,
                  "portal-connections-original.txt",
                  "text/plain",
                )
              }
            >
              Download original connections
            </button>
          )}
          <button
            className="button"
            onClick={() => action(system.replaceSaved)}
          >
            Replace saved connections
          </button>
        </div>
      )}
      {state.issues.length > 0 && (
        <Panel title="Connection health">
          <ul>
            {state.issues.map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
        </Panel>
      )}
      <p
        role={notice.startsWith("Error:") ? "alert" : "status"}
        className="portal-notice"
      >
        {notice}
      </p>
      {(summary || page === "identity" || page === "research") && (
        <Panel title="System identity" eyebrow="ICV CONTEXT">
          <label className="field system-select">
            <span>Active identity</span>
            <select
              value={state.connections.activeIdentityId ?? ""}
              onChange={(event) =>
                action(() => system.selectIdentity(event.target.value || null))
              }
            >
              <option value="">
                Workspace profile ({state.workspace.profile.name})
              </option>
              {state.identities.map((identity) => (
                <option value={identity.id} key={identity.id}>
                  {identity.name} ({identity.type})
                </option>
              ))}
            </select>
          </label>
          <p>
            Current ICV profile: {state.profile.name} · {state.profile.role}
          </p>
          {page === "identity" && (
            <Rows headers={["Identity", "Owned registry assets"]}>
              {state.identities.map((identity) => (
                <tr key={identity.id}>
                  <th scope="row">{identity.name}</th>
                  <td>
                    {identityAssets(identity.id, state.assets)
                      .map((asset) => asset.title)
                      .join(", ") || "None"}
                  </td>
                </tr>
              ))}
            </Rows>
          )}
        </Panel>
      )}
      {marketPage && (
        <Panel title="Market and asset connections">
          {assets.length && markets.length ? (
            <RecordForm
              submit="Link asset to market"
              fields={[
                { name: "assetId", label: "Registry asset", options: assets },
                { name: "marketId", label: "Target market", options: markets },
              ]}
              onSubmit={(values) => {
                system.linkAsset(values.assetId, values.marketId);
              }}
            />
          ) : (
            <Empty>
              Create a registry asset and a sourced market to connect ownership
              to opportunities.
            </Empty>
          )}
          {markets.length && initiatives.length ? (
            <RecordForm
              submit="Link market to PMD"
              fields={[
                {
                  name: "marketId",
                  label: "Opportunity market",
                  options: markets,
                },
                {
                  name: "initiativeId",
                  label: "PMD initiative",
                  options: initiatives,
                },
              ]}
              onSubmit={(values) =>
                system.linkInitiative(values.marketId, values.initiativeId)
              }
            />
          ) : (
            <Empty>
              Add a market in Opportunity Radar and an initiative in PMD Command
              Center to link them.
            </Empty>
          )}
          <Rows headers={["Market", "Registry assets", "PMD initiatives"]}>
            {marketConnections(
              state.workspace,
              state.assets,
              state.connections.marketInitiatives,
            ).map((link) => (
              <tr key={link.market.id}>
                <th scope="row">{link.market.name}</th>
                <td>
                  {link.assets.map((asset) => asset.title).join(", ") || "None"}
                </td>
                <td>
                  {link.initiatives
                    .map((initiative) => initiative.title)
                    .join(", ") || "None"}
                </td>
              </tr>
            ))}
          </Rows>
          {state.connections.marketInitiatives.map((link) => (
            <button
              key={JSON.stringify(link)}
              className="button small"
              onClick={() =>
                action(() =>
                  system.unlinkInitiative(link.marketId, link.initiativeId),
                )
              }
            >
              Unlink market {link.marketId} from PMD {link.initiativeId}
            </button>
          ))}
          <div className="button-row">
            <a className="button" href="#/portal/gsip-registry">
              Manage registered assets
            </a>
            <a className="button" href="#/portal/opportunities">
              Open Opportunity Radar
            </a>
            <a className="button" href="#/portal/pmd">
              Open PMD Command
            </a>
          </div>
        </Panel>
      )}
      {(agentPage || summary) && (
        <Panel title="Connected agent status">
          {agentPage && (
            <>
              {initiatives.length > 0 && (
                <RecordForm
                  submit="Assign PMD agent"
                  fields={[
                    {
                      name: "initiativeId",
                      label: "Assigned initiative",
                      options: initiatives,
                    },
                    {
                      name: "agentId",
                      label: "Agent executor",
                      options: AGENT_IDS,
                    },
                  ]}
                  onSubmit={(values) =>
                    system.assignAgent(
                      values.initiativeId,
                      values.agentId as AgentId,
                    )
                  }
                />
              )}
              {agents.length > 0 && (
                <RecordForm
                  submit="Bind agent identity"
                  fields={[
                    { name: "agentId", label: "Executor", options: AGENT_IDS },
                    {
                      name: "identityId",
                      label: "Agent identity",
                      options: agents,
                    },
                  ]}
                  onSubmit={(values) =>
                    system.bindAgent(
                      values.agentId as AgentId,
                      values.identityId,
                    )
                  }
                />
              )}
              <RecordForm
                submit="Run connected agents"
                fields={[
                  {
                    name: "prompt",
                    label: "Connected mission prompt",
                    type: "textarea",
                  },
                ]}
                onSubmit={(values) => {
                  system.runAgents(values.prompt);
                }}
              />
            </>
          )}
          <Rows
            headers={["Agent", "Identity", "Assigned initiatives", "Status"]}
          >
            {state.agents.map((agent) => (
              <tr key={agent.id}>
                <th scope="row">{agent.id}</th>
                <td>{agent.identityId ?? "Workspace context"}</td>
                <td>{agent.initiativeIds.join(", ") || "Workspace scope"}</td>
                <td>{agent.status}</td>
              </tr>
            ))}
          </Rows>
          {agentPage && (
            <>
              {state.connections.assignments.map((link) => (
                <button
                  key={JSON.stringify(link)}
                  className="button small"
                  onClick={() =>
                    action(() =>
                      system.unassignAgent(link.initiativeId, link.agentId),
                    )
                  }
                >
                  Unassign {link.agentId} from {link.initiativeId}
                </button>
              ))}
              {state.connections.agentIdentities.map((link) => (
                <button
                  key={link.agentId}
                  className="button small"
                  onClick={() => action(() => system.unbindAgent(link.agentId))}
                >
                  Unbind {link.agentId}
                </button>
              ))}
            </>
          )}
          <p className="note">
            Runs use linked PMD scope, research evidence and compliance records.
            Results become stale when those inputs change. Agents recommend;
            people accept mission actions in Agent Command Center.
          </p>
        </Panel>
      )}
      {page === "compliance" && (
        <section aria-label="Registry compliance">
          <h2>Registry asset compliance</h2>
          {state.assets.length ? (
            <Compliance
              data={system.registryWorkspace()}
              update={system.updateRegistryCompliance}
            />
          ) : (
            <Empty>
              Create an asset in the GS-IP Registry before auditing.
            </Empty>
          )}
        </section>
      )}
      {(summary || page === "compliance") && (
        <Panel title="System compliance coverage">
          <p>
            {state.compliance.status} · {state.compliance.reviewCount} findings
            requiring review
          </p>
          <ul>
            {state.compliance.decisions
              .filter(
                (decision) =>
                  decision.rule === "registry-ownership" &&
                  decision.status === "review",
              )
              .map((decision) => (
                <li key={decision.recordId}>
                  Audit {decision.recordId}: {decision.reasons.join(" ")}
                </li>
              ))}
            {state.compliance.unreviewedAssets.map((asset) => (
              <li key={asset}>No evidence: {asset}</li>
            ))}
          </ul>
        </Panel>
      )}
      {summary && (
        <>
          <button
            className="button"
            onClick={() =>
              download(system.exportConnections(), "portal-connections.json")
            }
          >
            Export system connections
          </button>
          <WorkerPanel state={state} />
        </>
      )}
    </section>
  );
}
