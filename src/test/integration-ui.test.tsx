// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SystemConnections from "../components/integration/SystemConnections";
import FounderConsole from "../components/integration/FounderConsole";
import WorkerPanel from "../components/integration/WorkerPanel";
import { Agents } from "../portal/AgentConsole";
import { integrationSetup, memory } from "./integration-fixtures";
import { download } from "../engine/io";
import { market } from "./portal-fixtures";
import type { DashboardId } from "../portal/navigation";
vi.mock("../engine/io", () => ({ download: vi.fn() }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  vi.clearAllMocks();
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});
function button(label: string) {
  const b = [...host.querySelectorAll("button")].find(
    (b) => b.textContent === label,
  );
  if (!b) throw Error("Missing " + label);
  return b;
}
async function click(label: string) {
  await act(async () => button(label).click());
}
async function submit(label: string, values: Record<string, string>) {
  const form = button(label).closest("form")!;
  for (const [name, value] of Object.entries(values)) {
    const field = form.elements.namedItem(name) as HTMLInputElement;
    if (field.type === "checkbox") field.checked = value === "on";
    else field.value = value;
  }
  await act(async () => {
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  });
}
async function select(select: HTMLSelectElement, value: string) {
  await act(async () => {
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
describe("connected dashboards", () => {
  it("creates links, assigns agents, audits registry assets and reflects all changes in Founder Console", async () => {
    const f = integrationSetup();
    const show = async (page: DashboardId) =>
      act(async () =>
        root.render(<SystemConnections page={page} system={f.system} />),
      );
    await show("identity");
    expect(host.textContent).toContain("Registered report");
    expect(host.textContent).toContain("None");
    await select(host.querySelector("select")!, "owner");
    expect(f.system.getSnapshot().profile.id).toBe("owner");
    await select(host.querySelector("select")!, "");
    expect(f.system.getSnapshot().connections.activeIdentityId).toBe(null);
    await show("pmd");
    await submit("Link asset to market", {
      assetId: "registered",
      marketId: market.id,
    });
    await submit("Link market to PMD", {
      marketId: market.id,
      initiativeId: "initiative",
    });
    await submit("Assign PMD agent", {
      initiativeId: "initiative",
      agentId: "market",
    });
    await submit("Bind agent identity", {
      agentId: "market",
      identityId: "bot",
    });
    await submit("Run connected agents", { prompt: "Plan the next delivery" });
    expect(
      f.system.getSnapshot().agents.find((a) => a.id === "market")?.result,
    ).not.toBe(null);
    expect(host.textContent).toContain("Climate plan");
    await show("compliance");
    await submit("Record and audit", {
      assetId: "registered",
      owner: "Founder",
      copyright: "Original",
      trademark: "None used",
      license: "Internal",
      reviewer: "Reviewer",
      approved: "on",
      likelihood: "1",
      impact: "2",
      source: "Synthetic evidence",
      observedAt: "2026-10-26T10:00",
    });
    expect(f.system.getSnapshot().connections.auditHistory).toHaveLength(1);
    expect(f.system.getSnapshot().compliance.status).toBe("pass");
    expect(host.textContent).toContain("Registry asset compliance");
    await show("founder");
    expect(host.textContent).toContain("Total Identities");
    expect(host.textContent).toContain("Total Assets");
    expect(host.textContent).toContain("Revenue");
    expect(host.textContent).toContain("Mission Status");
    await click("Export system connections");
    expect(download).toHaveBeenCalledWith(
      f.system.exportConnections(),
      "portal-connections.json",
    );
    await show("pmd");
    await click("Unbind market");
    await click("Unassign market from initiative");
    await click("Unlink market market-1 from PMD initiative");
    expect(f.system.getSnapshot().connections.assignments).toEqual([]);
  });
  it("shows empty, missing, storage recovery and actionable error states", async () => {
    const f = integrationSetup(memory("{broken"));
    await act(async () =>
      root.render(<SystemConnections page="founder" system={f.system} />),
    );
    await click("Download original connections");
    expect(download).toHaveBeenCalledWith(
      "{broken",
      "portal-connections-original.txt",
      "text/plain",
    );
    vi.spyOn(f.storage, "setItem").mockImplementationOnce(() => {
      throw Error("quota");
    });
    await click("Replace saved connections");
    expect(host.textContent).toContain("Error: Unable to save");
    await click("Replace saved connections");
    expect(f.system.getSnapshot().error).toBe("");
    vi.spyOn(f.system, "selectIdentity").mockImplementationOnce(() => {
      throw "unknown";
    });
    await select(host.querySelector("select")!, "owner");
    expect(host.textContent).toContain("Operation failed");
    await act(async () => {
      f.portal.setState(({ data }) => ({
        data: { ...data, markets: [], initiatives: [] },
      }));
      f.identities.removeIdentity("bot");
    });
    await act(async () =>
      root.render(<SystemConnections page="pmd" system={f.system} />),
    );
    expect(host.textContent).toContain("Create a registry asset");
    expect(host.textContent).toContain("Add a market");
    await act(async () =>
      root.render(<SystemConnections page="research" system={f.system} />),
    );
    expect(host.textContent).toContain("Current ICV profile");
    const state = f.system.getSnapshot();
    await act(async () =>
      root.render(
        <FounderConsole
          state={{
            ...state,
            workspace: {
              ...state.workspace,
              missions: [
                {
                  id: "done",
                  title: "Delivered",
                  owner: "Founder",
                  priority: "high",
                  status: "complete",
                },
              ],
            },
            agents: state.agents.map((a, i) => ({
              ...a,
              status: i === 0 ? "ready-for-review" : i === 1 ? "stale" : "idle",
            })),
          }}
        />,
      ),
    );
    expect(host.textContent).toContain("1/1");
    expect(host.textContent).toContain("Delivered");
    expect(host.textContent).toContain("1 ready");
  });
  it("makes shared PMD recommendations available for human acceptance as missions", async () => {
    const f = integrationSetup();
    f.system.runAgents("Plan delivery");
    const results = Object.fromEntries(
      f.system.getSnapshot().agents.map((a) => [a.id, a.result!]),
    );
    await act(async () =>
      root.render(
        <Agents
          data={f.portal.getState().data}
          sharedResults={results}
          onRun={f.system.runAgents}
          update={(change) =>
            f.portal.setState(({ data }) => ({ data: change(data) }))
          }
        />,
      ),
    );
    expect(button("Record mission action")).toBeTruthy();
    await click("Record mission action");
    expect(f.portal.getState().data.missions).toHaveLength(1);
    await submit("Run agents", { prompt: "Re-plan" });
    expect(f.system.getSnapshot().agents[0].status).not.toBe("idle");
  });
});
describe("Worker dashboard adapter", () => {
  it("handles missing and invalid configuration and sends domain snapshots with displayed remote results", async () => {
    const state = integrationSetup().system.getSnapshot();
    await act(async () =>
      root.render(<WorkerPanel state={state} baseUrl="" />),
    );
    expect(button("Call Worker adapter").disabled).toBe(true);
    const form = button("Call Worker adapter").closest("form")!;
    await act(async () => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    await act(async () =>
      root.render(<WorkerPanel state={state} baseUrl="invalid" />),
    );
    expect(host.textContent).toContain("configuration is invalid");
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(
        async () => new Response('{"version":1,"data":{"accepted":true}}'),
      );
    await act(async () =>
      root.render(
        <WorkerPanel
          state={state}
          baseUrl="https://worker.example/"
          fetcher={fetcher}
        />,
      ),
    );
    await select(host.querySelector("select")!, "gsip");
    const textarea = host.querySelector("textarea")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )!.set!.call(textarea, "Plan");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await submit("Call Worker adapter", {});
    expect(fetcher.mock.calls[0][0]).toBe("https://worker.example/api/gsip");
    expect(host.textContent).toContain('"accepted": true');
    fetcher.mockRejectedValueOnce(Error("offline"));
    await submit("Call Worker adapter", {});
    expect(host.textContent).toContain("offline");
    fetcher.mockRejectedValueOnce("unknown");
    await submit("Call Worker adapter", {});
    expect(host.textContent).toContain("Worker request failed.");
  });
  it("aborts obsolete requests on reconfiguration and unmount, allowing a new request", async () => {
    const state = integrationSetup().system.getSnapshot();
    const signals: AbortSignal[] = [];
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          const signal = options!.signal!;
          signals.push(signal);
          signal.addEventListener("abort", () => reject(Error("cancelled")));
        }),
    );
    await act(async () =>
      root.render(
        <WorkerPanel
          state={state}
          baseUrl="https://one.example"
          fetcher={fetcher}
        />,
      ),
    );
    await submit("Call Worker adapter", {});
    expect(button("Calling Worker…").disabled).toBe(true);
    await act(async () =>
      root.render(
        <WorkerPanel
          state={state}
          baseUrl="https://two.example"
          fetcher={fetcher}
        />,
      ),
    );
    expect(signals[0].aborted).toBe(true);
    expect(button("Call Worker adapter").disabled).toBe(false);
    await submit("Call Worker adapter", {});
    await act(async () => root.render(<div />));
    expect(signals[1].aborted).toBe(true);
  });
});
