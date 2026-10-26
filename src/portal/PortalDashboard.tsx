import SystemConnections from "../components/integration/SystemConnections";
import { usePortalSystem } from "../integration/usePortalSystem";
import { portalSystem } from "../integration/system";
import GSIPRegistryDashboard from "../components/gsip/GSIPRegistryDashboard";
import { Research } from "./ResearchConsole";
import IdentityDashboard from "../components/identity/IdentityDashboard";
import { Compliance } from "./ComplianceConsole";
import { Agents } from "./AgentConsole";
import { numeric, txt, Rows, Empty, Stat } from "./DashboardUI";
import { useMemo, useRef, useState } from "react";
import { Panel, number } from "../components/UI";
import { download } from "../engine/io";
import { createId } from "../engine/id";
import type { Page } from "../types";
import { DASHBOARDS, type DashboardId } from "./navigation";
import { composeDashboard } from "./dashboard";
import {
  usePortal,
  exportWorkspace,
  importWorkspace,
  sourceFields,
  type PortalWorkspace,
} from "./workspace";
import { RecordForm, sourceInputs } from "./forms";
import { createProfile } from "../icv/identity";
import { scanMarket } from "../markets/scanner";
import { createAsset, STAGES } from "../gsip/creation";
import { progressAsset } from "../gsip/pipeline";
import { recordRevenue } from "../gsip/revenue";
import { PMD_DOMAINS, type PMDDomain } from "../pmd/contracts";
import { PMD_ASSESSORS } from "../pmd/registry";
import { createMission, type MissionAction } from "../mission/planning";
import { INDICATORS } from "../umbrella/dashboard";
import { executePortalCommand } from "./commands";
import { requireText } from "./contracts";

function Settings({
  data,
  update,
}: {
  data: PortalWorkspace;
  update: (change: (w: PortalWorkspace) => PortalWorkspace) => void;
}) {
  return (
    <details className="portal-settings">
      <summary>Workspace, project, profile & goals</summary>
      <RecordForm
        key={`${data.name}-${data.project}-${data.profile.name}`}
        submit="Save workspace settings"
        fields={[
          { ...txt("name", "Workspace name"), value: data.name },
          { ...txt("project", "Project name"), value: data.project },
          { ...txt("profile", "Your name"), value: data.profile.name },
          {
            name: "role",
            label: "Role",
            options: ["founder", "researcher", "analyst"],
            value: data.profile.role,
          },
          {
            name: "goals",
            label: "Goals (one per line)",
            type: "textarea",
            optional: true,
            value: data.goals.join("\n"),
          },
        ]}
        onSubmit={(v) =>
          update((w) => ({
            ...w,
            name: requireText(v.name, "Workspace"),
            project: requireText(v.project, "Project"),
            profile: createProfile(v.profile, v.role as typeof w.profile.role),
            goals: v.goals
              .split("\n")
              .map((g) => g.trim())
              .filter(Boolean),
          }))
        }
      />
    </details>
  );
}
export default function PortalDashboard({
  page,
  navigate,
  openWorkbench,
  selected,
  onFailure,
}: {
  page: DashboardId;
  navigate: (id: DashboardId) => void;
  openWorkbench: (id: Page) => void;
  selected: string | null;
  onFailure: (seeds: string[]) => void;
}) {
  const { data, error, recovery, update, restore, replaceSaved } = usePortal();
  const systemState = usePortalSystem();
  const summary = useMemo(() => composeDashboard(data), [data]);
  const file = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState("");
  const [replaceText, setReplaceText] = useState<string | null>(null);
  const action = (fn: () => void) => {
    try {
      fn();
      setNotice("Workspace updated.");
    } catch (e) {
      setNotice(
        `Error: ${e instanceof Error ? e.message : "Operation failed."}`,
      );
    }
  };
  const title = DASHBOARDS.find((d) => d.id === page)!.title;
  if (page === "gsip-registry")
    return (
      <>
        <SystemConnections page={page} />
        <GSIPRegistryDashboard />
      </>
    );
  if (page === "identity")
    return (
      <>
        <SystemConnections page={page} />
        <IdentityDashboard />
      </>
    );
  return (
    <section className="portal-dashboard" aria-label={title}>
      <div className="portal-workspace-bar">
        <span>
          <b>{data.name}</b> / {data.project}
        </span>
        <div className="button-row">
          <button
            className="button small"
            onClick={() =>
              download(exportWorkspace(data), "portal-workspace.json")
            }
          >
            Export Portal workspace
          </button>
          <button
            className="button small"
            onClick={() => file.current?.click()}
          >
            Import Portal workspace
          </button>
        </div>
      </div>
      <input
        ref={file}
        type="file"
        accept=".json"
        hidden
        onChange={async (event) => {
          const selectedFile = event.target.files?.[0];
          event.target.value = "";
          if (!selectedFile) return;
          if (selectedFile.size > 2_000_000) {
            setNotice("Error: Workspace imports are limited to 2 MB.");
            return;
          }
          try {
            const text = await selectedFile.text();
            importWorkspace(text);
            setReplaceText(text);
          } catch (e) {
            setNotice(
              `Error: ${e instanceof Error ? e.message : "Import failed."}`,
            );
          }
        }}
      />
      {replaceText !== null && (
        <div className="notice-banner" role="status">
          <span>
            Replace the current Portal workspace with this validated import?
            Export the current workspace to keep a backup.
          </span>
          <button
            className="button"
            onClick={() =>
              action(() => {
                restore(replaceText);
                setReplaceText(null);
              })
            }
          >
            Replace workspace
          </button>
          <button className="button" onClick={() => setReplaceText(null)}>
            Cancel
          </button>
        </div>
      )}
      {error && (
        <div className="notice-banner" role="alert">
          <span>{error}</span>
          {recovery !== null && (
            <>
              <button
                className="button"
                onClick={() =>
                  download(recovery, "portal-original-data.txt", "text/plain")
                }
              >
                Download original data
              </button>
              <button className="button" onClick={replaceSaved}>
                Replace saved copy
              </button>
            </>
          )}
        </div>
      )}
      <p
        role={notice.startsWith("Error:") ? "alert" : "status"}
        className="portal-notice"
      >
        {notice}
      </p>
      <Settings data={data} update={update} />
      <SystemConnections page={page} />
      {page === "executive" && (
        <>
          <div className="portal-stats">
            <Stat
              title="Evidence"
              value={String(data.observations.length)}
              detail="User-recorded observations"
            />
            <Stat
              title="Assets"
              value={String(summary.assets.total)}
              detail={`${summary.assets.earning} earning`}
            />
            <Stat
              title="Annual revenue"
              value={`$${number(summary.assets.annualRevenue, 0)}`}
              detail="Recorded USD/year"
            />
            <Stat
              title="Readiness"
              value={
                summary.readiness === null
                  ? "N/A"
                  : `${number(summary.readiness, 1)}%`
              }
              detail="Mean completed readiness checks"
            />
          </div>
          <Panel title="Mission control" eyebrow="PORTAL-OS ALPHA">
            <div className="portal-cards">
              {DASHBOARDS.filter((d) => d.id !== "executive").map((d) => (
                <button
                  key={d.id}
                  className="portal-card"
                  onClick={() => navigate(d.id)}
                >
                  <strong>{d.title}</strong>
                  <span>{d.description}</span>
                </button>
              ))}
            </div>
          </Panel>
          <Panel title="Command router">
            <RecordForm
              fields={[
                txt(
                  "command",
                  "Command (Open Research Console; Compute Identity Invariant)",
                ),
              ]}
              submit="Run command"
              onSubmit={(v) =>
                setNotice(
                  executePortalCommand(
                    v.command,
                    navigate,
                    selected,
                    onFailure,
                  ),
                )
              }
            />
          </Panel>
          <Panel title="Current priorities">
            {summary.missions
              .filter((m) => m.status !== "complete")
              .slice(0, 5)
              .map((m) => (
                <p key={m.id}>
                  {m.priority.toUpperCase()} · {m.title} · {m.owner}
                </p>
              ))}
            {!data.missions.length && (
              <Empty>
                Record your first action in the Founder Mission Console.
              </Empty>
            )}
            <button
              className="button"
              onClick={() => openWorkbench("Topology")}
            >
              Open architecture graph
            </button>
          </Panel>
        </>
      )}
      {page === "opportunities" && (
        <>
          <Panel title="Record a market estimate" eyebrow="SOURCED ASSUMPTIONS">
            <RecordForm
              submit="Add market"
              fields={[
                txt("name", "Market name"),
                numeric("customers", "Potential customers"),
                numeric("annualSpend", "Annual spend per customer (USD)"),
                numeric("serviceableFraction", "Serviceable fraction (0–1)", 1),
                numeric(
                  "obtainableFraction",
                  "Obtainable fraction of SAM (0–1)",
                  1,
                ),
                numeric("annualGrowth", "Annual growth (−1 to 1)", 1, -1),
                { ...numeric("competitors", "Competitor count"), step: "1" },
                ...sourceInputs,
              ]}
              onSubmit={(v) =>
                update((w) => ({
                  ...w,
                  markets: [
                    ...w.markets,
                    scanMarket({
                      id: createId(),
                      name: v.name,
                      customers: Number(v.customers),
                      annualSpend: Number(v.annualSpend),
                      serviceableFraction: Number(v.serviceableFraction),
                      obtainableFraction: Number(v.obtainableFraction),
                      annualGrowth: Number(v.annualGrowth),
                      competitors: Number(v.competitors),
                      ...sourceFields(v.source, v.observedAt),
                    }),
                  ],
                }))
              }
            />
          </Panel>
          <Panel title="Opportunity radar">
            {!data.markets.length ? (
              <Empty>
                Add sourced assumptions to calculate TAM, SAM, SOM, and
                opportunity scores.
              </Empty>
            ) : (
              <Rows
                headers={[
                  "Market",
                  "TAM / SAM / SOM (USD/year)",
                  "Opportunity / Growth / Competition",
                  "3-year SOM scenario",
                  "Source / observed at",
                ]}
              >
                {summary.opportunities.map((m) => (
                  <tr key={m.id}>
                    <th scope="row">{m.name}</th>
                    <td>
                      {[m.tam, m.sam, m.som]
                        .map((v) => number(v, 0))
                        .join(" / ")}
                    </td>
                    <td>
                      {[m.opportunityScore, m.growthScore, m.competitionScore]
                        .map((v) => number(v, 1))
                        .join(" / ")}
                    </td>
                    <td>{number(m.forecast.value, 0)}</td>
                    <td>
                      {m.source}
                      <br />
                      {m.observedAt}
                    </td>
                  </tr>
                ))}
              </Rows>
            )}
            <p className="note">
              TAM = customers × annual spend. SAM = TAM × serviceable fraction.
              SOM = SAM × obtainable fraction. Growth = (annual growth + 1) ×
              50. Competition = competitors/(competitors + 1) × 100. Opportunity
              = growth × (1 − competition/100) × both fractions. Forecast
              assumes constant compound growth. Scores are heuristics from
              recorded assumptions.
            </p>
          </Panel>
        </>
      )}
      {page === "research" && (
        <Research
          data={{ ...data, profile: systemState.profile }}
          update={update}
          openWorkbench={openWorkbench}
        />
      )}
      {page === "factory" && (
        <>
          <Panel title="Create an owned asset" eyebrow="CREATION → EXPANSION">
            {!data.markets.length ? (
              <Empty>
                Add a market in Opportunity Radar before assigning an asset.
              </Empty>
            ) : (
              <RecordForm
                fields={[
                  txt("title", "Asset title"),
                  txt("owner", "Owner"),
                  txt("category", "Category"),
                  {
                    name: "marketId",
                    label: "Market assignment",
                    options: data.markets.map((m) => ({
                      value: m.id,
                      label: m.name,
                    })),
                  },
                ]}
                submit="Create asset"
                onSubmit={(v) =>
                  update((w) => ({
                    ...w,
                    assets: [
                      ...w.assets,
                      createAsset(
                        createId(),
                        v.title,
                        v.owner,
                        v.category,
                        v.marketId,
                      ),
                    ],
                  }))
                }
              />
            )}
          </Panel>
          <Panel title="Factory pipeline">
            <ol
              className="portal-pipeline"
              tabIndex={0}
              aria-label="Asset lifecycle stages"
            >
              {STAGES.map((stage) => (
                <li key={stage}>
                  {stage}
                  <b>{data.assets.filter((a) => a.stage === stage).length}</b>
                </li>
              ))}
            </ol>
            {!data.assets.length && <Empty>No assets yet.</Empty>}
            {data.assets.map((asset) => (
              <article className="portal-record" key={asset.id}>
                <h3>{asset.title}</h3>
                <p>
                  {asset.id} · {asset.owner} · {asset.category} · {asset.status}
                </p>
                <p>
                  {asset.stage} · Revenue: {asset.revenueState} ($
                  {number(asset.annualRevenue, 0)}/year) · Market:{" "}
                  {data.markets.find((m) => m.id === asset.marketId)?.name}
                </p>
                <p className="note">History: {asset.history.join(" → ")}</p>
                <div className="button-row">
                  <button
                    className="button"
                    disabled={
                      asset.stage === "expansion" || asset.status !== "active"
                    }
                    onClick={() =>
                      action(() =>
                        update((w) => ({
                          ...w,
                          assets: w.assets.map((a) =>
                            a.id === asset.id ? progressAsset(a) : a,
                          ),
                        })),
                      )
                    }
                  >
                    Advance stage
                  </button>
                  <button
                    className="button"
                    onClick={() =>
                      action(() =>
                        update((w) => ({
                          ...w,
                          assets: w.assets.map((a) =>
                            a.id === asset.id
                              ? {
                                  ...a,
                                  status:
                                    a.status === "active" ? "paused" : "active",
                                }
                              : a,
                          ),
                        })),
                      )
                    }
                  >
                    {asset.status === "active" ? "Pause" : "Resume"}
                  </button>
                </div>
                {["revenue", "expansion"].includes(asset.stage) && (
                  <RecordForm
                    fields={[
                      numeric("revenue", "Recorded annual revenue (USD)"),
                    ]}
                    submit="Record revenue"
                    onSubmit={(v) =>
                      update((w) => ({
                        ...w,
                        assets: w.assets.map((a) =>
                          a.id === asset.id
                            ? recordRevenue(a, Number(v.revenue))
                            : a,
                        ),
                      }))
                    }
                  />
                )}
              </article>
            ))}
          </Panel>
        </>
      )}
      {page === "pmd" && (
        <>
          <Panel title="Record initiative readiness">
            <RecordForm
              fields={[
                txt("title", "Initiative title"),
                { name: "domain", label: "PMD domain", options: PMD_DOMAINS },
                txt("owner", "Owner"),
                {
                  name: "priority",
                  label: "Priority",
                  options: ["high", "normal", "low"],
                },
                {
                  name: "stage",
                  label: "Stage",
                  options: ["discovery", "pilot", "delivery"],
                },
                numeric("completedChecks", "Completed readiness checks"),
                numeric("totalChecks", "Total readiness checks", undefined, 1),
                numeric("matchedGoals", "Matched goals"),
                numeric("totalGoals", "Total goals", undefined, 1),
              ]}
              submit="Add initiative"
              onSubmit={(v) =>
                update((w) => ({
                  ...w,
                  initiatives: [
                    ...w.initiatives,
                    PMD_ASSESSORS[v.domain as PMDDomain]({
                      id: createId(),
                      title: v.title,
                      owner: v.owner,
                      status: "planned",
                      priority: v.priority as "high" | "normal" | "low",
                      stage: v.stage as "discovery" | "pilot" | "delivery",
                      completedChecks: Number(v.completedChecks),
                      totalChecks: Number(v.totalChecks),
                      matchedGoals: Number(v.matchedGoals),
                      totalGoals: Number(v.totalGoals),
                    }),
                  ],
                }))
              }
            />
            <p className="note">
              Readiness = completed / total checks × 100. Alignment = matched /
              total goals × 100. Counts are operator assessments.
            </p>
          </Panel>
          <div className="portal-cards">
            {PMD_DOMAINS.map((domain) => (
              <Panel key={domain} title={domain.toUpperCase()}>
                {data.initiatives
                  .filter((i) => i.domain === domain)
                  .map((i) => (
                    <article className="portal-record" key={i.id}>
                      <h3>{i.title}</h3>
                      <p>
                        {i.owner} · {i.priority} · {i.stage}
                      </p>
                      <p>
                        Readiness {number(i.readinessScore, 1)}% · Alignment{" "}
                        {number(i.alignmentScore, 1)}%
                      </p>
                      <label className="field">
                        <span>Status</span>
                        <select
                          value={i.status}
                          onChange={(e) =>
                            action(() =>
                              update((w) => ({
                                ...w,
                                initiatives: w.initiatives.map((item) =>
                                  item.id === i.id
                                    ? {
                                        ...item,
                                        status: e.target
                                          .value as typeof i.status,
                                      }
                                    : item,
                                ),
                              })),
                            )
                          }
                        >
                          {["planned", "active", "blocked", "complete"].map(
                            (s) => (
                              <option key={s}>{s}</option>
                            ),
                          )}
                        </select>
                      </label>
                      <RecordForm
                        fields={[
                          {
                            ...numeric(
                              "checks",
                              "Completed checks",
                              i.totalChecks,
                            ),
                            value: String(i.completedChecks),
                          },
                          {
                            ...numeric("goals", "Matched goals", i.totalGoals),
                            value: String(i.matchedGoals),
                          },
                        ]}
                        submit="Update readiness"
                        onSubmit={(v) =>
                          update((w) => ({
                            ...w,
                            initiatives: w.initiatives.map((item) =>
                              item.id === i.id
                                ? PMD_ASSESSORS[item.domain]({
                                    ...item,
                                    completedChecks: Number(v.checks),
                                    matchedGoals: Number(v.goals),
                                  })
                                : item,
                            ),
                          }))
                        }
                      />
                    </article>
                  ))}
                {!data.initiatives.some((i) => i.domain === domain) && (
                  <Empty>No initiatives recorded.</Empty>
                )}
              </Panel>
            ))}
          </div>
        </>
      )}
      {page === "compliance" && <Compliance data={data} update={update} />}
      {page === "agents" && (
        <Agents
          data={{ ...data, profile: systemState.profile }}
          update={update}
          onRun={portalSystem.runAgents}
          sharedResults={Object.fromEntries(
            systemState.agents
              .filter((agent) => agent.result && agent.status !== "stale")
              .map((agent) => [agent.id, agent.result!]),
          )}
        />
      )}
      {page === "umbrella" && (
        <>
          <Panel
            title="Planetary indicators"
            eyebrow="LATEST SOURCED OBSERVATIONS"
          >
            <div className="portal-cards">
              {summary.indicators.map((i) => (
                <Stat
                  key={i.domain}
                  title={i.label}
                  value={
                    i.observation ? number(i.observation.value, 2) : "No data"
                  }
                  detail={`${i.unit} · ${i.observation ? `${i.observation.source} · ${i.observation.observedAt}` : "Record evidence in Research Console"}`}
                />
              ))}
            </div>
            <p className="note">
              Only exact domain, metric, and unit matches are used. Latest
              timestamp wins. No aggregation of incompatible indicators.
            </p>
            <button className="button" onClick={() => navigate("research")}>
              Record planetary evidence
            </button>
            <Rows headers={["Domain", "Metric", "Unit"]}>
              {INDICATORS.map((i) => (
                <tr key={i.domain}>
                  <td>{i.domain}</td>
                  <td>{i.metric}</td>
                  <td>{i.unit}</td>
                </tr>
              ))}
            </Rows>
          </Panel>
        </>
      )}
      {page === "mission" && (
        <>
          <Panel title="Founder mission plan">
            <RecordForm
              fields={[
                txt("title", "Next action"),
                { ...txt("owner", "Owner"), value: data.profile.name },
                {
                  name: "priority",
                  label: "Priority",
                  options: ["high", "normal", "low"],
                },
              ]}
              submit="Record action"
              onSubmit={(v) =>
                update((w) => ({
                  ...w,
                  missions: [
                    ...w.missions,
                    createMission(
                      createId(),
                      v.title,
                      v.owner,
                      v.priority as MissionAction["priority"],
                    ),
                  ],
                }))
              }
            />
          </Panel>
          <Panel title="Owned actions">
            {!summary.missions.length && (
              <Empty>
                Record an action or accept a recommendation from Agent Command
                Center.
              </Empty>
            )}
            {summary.missions.map((m) => (
              <article className="portal-record" key={m.id}>
                <h3>{m.title}</h3>
                <p>
                  {m.owner} · {m.priority}
                </p>
                <label className="field">
                  <span>Action status</span>
                  <select
                    value={m.status}
                    onChange={(e) =>
                      action(() =>
                        update((w) => ({
                          ...w,
                          missions: w.missions.map((item) =>
                            item.id === m.id
                              ? {
                                  ...item,
                                  status: e.target
                                    .value as MissionAction["status"],
                                }
                              : item,
                          ),
                        })),
                      )
                    }
                  >
                    {["planned", "active", "complete"].map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </label>
              </article>
            ))}
          </Panel>
        </>
      )}
    </section>
  );
}
