// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PortalDashboard from "../portal/PortalDashboard";
import { RecordForm } from "../portal/forms";
import { DASHBOARDS, type DashboardId } from "../portal/navigation";
import { newWorkspace, usePortal, exportWorkspace } from "../portal/workspace";
import { populatedWorkspace } from "./portal-fixtures";
import { useWorkbench } from "../state/workbench";
import { SAMPLE } from "../data/sample";
import { download } from "../engine/io";
vi.mock("../engine/io", () => ({ download: vi.fn() }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let host: HTMLDivElement, root: Root;
const navigate = vi.fn(),
  openWorkbench = vi.fn(),
  onFailure = vi.fn();
beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  localStorage.clear();
  usePortal.setState({ data: newWorkspace(), error: "", recovery: null });
  useWorkbench.getState().replace(SAMPLE, "UI fixture");
  vi.clearAllMocks();
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
async function show(page: DashboardId) {
  await act(async () =>
    root.render(
      <PortalDashboard
        page={page}
        navigate={navigate}
        openWorkbench={openWorkbench}
        selected={null}
        onFailure={onFailure}
      />,
    ),
  );
}
function button(text: string): HTMLButtonElement {
  const result = [...host.querySelectorAll("button")].find(
    (b) =>
      b.textContent === text || b.querySelector("strong")?.textContent === text,
  );
  if (!result) throw new Error(`Button not found: ${text}`);
  return result;
}
async function click(text: string) {
  await act(async () => button(text).click());
}
async function submit(label: string, values: Record<string, string | boolean>) {
  const form = button(label).closest("form")!;
  for (const [key, value] of Object.entries(values)) {
    const field = form.elements.namedItem(key);
    if (!(
      field instanceof HTMLInputElement ||
      field instanceof HTMLSelectElement ||
      field instanceof HTMLTextAreaElement
    ))
      throw new Error(`Field not found: ${key}`);
    if (field instanceof HTMLInputElement && field.type === "checkbox")
      field.checked = value === true;
    else field.value = String(value);
  }
  await act(async () => {
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  });
}
const sourced = { source: "Synthetic study", observedAt: "2026-10-26T10:00" };
describe("Portal dashboard workflows", () => {
  it("renders all nine dashboards with empty evidence and labeled native controls", async () => {
    for (const page of DASHBOARDS) {
      await show(page.id);
      expect(host.querySelector(`[aria-label="${page.title}"]`)).not.toBeNull();
      expect(host.textContent).not.toContain("NaN");
      for (const input of host.querySelectorAll(
        "input:not([type=file]),select,textarea",
      ))
        expect(input.closest("label")).not.toBeNull();
    }
    await show("executive");
    await click("Opportunity Radar");
    expect(navigate).toHaveBeenCalledWith("opportunities");
    await click("Open architecture graph");
    expect(openWorkbench).toHaveBeenCalledWith("Topology");
    await submit("Run command", { command: "Open Research Console" });
    expect(navigate).toHaveBeenCalledWith("research");
    await submit("Run command", { command: "Delete everything" });
    expect(host.querySelector("[role=alert]")?.textContent).toContain(
      "Supported",
    );
    await submit("Save workspace settings", {
      name: "Lab",
      project: "Climate",
      profile: "Analyst",
      role: "analyst",
      goals: "research climate\navoid risk",
    });
    expect(usePortal.getState().data).toMatchObject({
      name: "Lab",
      goals: ["research climate", "avoid risk"],
      profile: { name: "Analyst", role: "analyst" },
    });
  });
  it("creates markets and advances assets through every factory stage, guarding expansion", async () => {
    await show("opportunities");
    await submit("Add market", {
      name: "Synthetic market",
      customers: "1000",
      annualSpend: "100",
      serviceableFraction: "0.5",
      obtainableFraction: "0.1",
      annualGrowth: "0.2",
      competitors: "3",
      ...sourced,
    });
    expect(usePortal.getState().data.markets).toHaveLength(1);
    expect(host.textContent).toContain("5,000");
    await show("factory");
    await submit("Create asset", {
      title: "Report",
      owner: "Founder",
      category: "Research",
    });
    expect(usePortal.getState().data.assets[0].stage).toBe("creation");
    await click("Pause");
    expect(button("Advance stage").disabled).toBe(true);
    await click("Resume");
    for (let i = 0; i < 6; i++) await click("Advance stage");
    await click("Advance stage");
    expect(host.textContent).toContain("positive revenue");
    await submit("Record revenue", { revenue: "100" });
    await click("Advance stage");
    expect(usePortal.getState().data.assets[0]).toMatchObject({
      stage: "expansion",
      annualRevenue: 100,
      revenueState: "earning",
    });
    expect(button("Advance stage").disabled).toBe(true);
    await show("executive");
    expect(host.textContent).toContain("1 earning");
  });
  it("records evidence, analyzes context, models it in the protected graph and displays planetary indicators", async () => {
    await show("research");
    await submit("Record observation", {
      domain: "climate",
      metric: "emissions",
      value: "12",
      unit: "tCO2e/year",
      ...sourced,
    });
    await submit("Analyze input", { input: "Research climate" });
    expect(host.textContent).toContain("N/A (no goals)");
    await act(async () =>
      usePortal
        .getState()
        .update((w) => ({ ...w, goals: ["research climate"] })),
    );
    await submit("Analyze input", { input: "research climate" });
    expect(host.textContent).toContain("100.0%");
    await click("Model in graph");
    expect(useWorkbench.getState().graph.nodes).toHaveLength(13);
    await click("Model in graph");
    expect(host.textContent).toContain("unique");
    await click("Spectral analysis");
    expect(openWorkbench).toHaveBeenCalledWith("Spectral analysis");
    await show("umbrella");
    expect(host.textContent).toContain("12.00");
    expect(host.textContent).toContain("Synthetic study");
    await click("Record planetary evidence");
    expect(navigate).toHaveBeenCalledWith("research");
    await show("research");
    await submit("Record observation", {
      domain: "climate",
      metric: "emissions",
      value: "12",
      unit: "tCO2e/year",
      source: "",
      observedAt: "bad",
    });
    expect(host.querySelector("[role=alert]")).not.toBeNull();
  });
  it("records PMD progress, audits and corrects evidence, accepts agent recommendations and completes missions", async () => {
    await act(async () => usePortal.setState({ data: populatedWorkspace() }));
    await show("pmd");
    await submit("Add initiative", {
      title: "Pilot",
      domain: "climate",
      owner: "Founder",
      priority: "high",
      stage: "pilot",
      completedChecks: "1",
      totalChecks: "2",
      matchedGoals: "1",
      totalGoals: "2",
    });
    expect(usePortal.getState().data.initiatives[0].readinessScore).toBe(50);
    const status = [...host.querySelectorAll("select")].find((s) =>
      [...s.options].some((o) => o.value === "blocked"),
    )!;
    await act(async () => {
      status.value = "active";
      status.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await submit("Update readiness", { checks: "2", goals: "2" });
    expect(usePortal.getState().data.initiatives[0]).toMatchObject({
      status: "active",
      readinessScore: 100,
      alignmentScore: 100,
    });
    await show("compliance");
    await submit("Record and audit", {
      owner: "",
      copyright: "",
      trademark: "",
      license: "",
      personalData: true,
      lawfulBasis: "",
      retentionDays: "",
      reviewer: "",
      approved: false,
      likelihood: "",
      impact: "",
      ...sourced,
    });
    expect(usePortal.getState().data.compliance).toHaveLength(2);
    expect(host.textContent).toContain("lawful basis");
    await click("Edit evidence");
    await submit("Update audit record", {
      owner: "Founder",
      copyright: "Original",
      trademark: "N/A: no mark",
      license: "MIT",
      personalData: true,
      lawfulBasis: "Consent",
      retentionDays: "30",
      reviewer: "Reviewer",
      approved: true,
      likelihood: "1",
      impact: "2",
      ...sourced,
    });
    expect(usePortal.getState().data.compliance[0]).toMatchObject({
      personalData: true,
      lawfulBasis: "Consent",
      retentionDays: 30,
    });
    await click("New record");
    expect(button("Record and audit")).not.toBeNull();
    await show("agents");
    await submit("Run agents", { prompt: "research climate" });
    expect(host.textContent).toContain("ready-for-review");
    await click("Record mission action");
    expect(usePortal.getState().data.missions).toHaveLength(1);
    await show("mission");
    await submit("Record action", {
      title: "Review sources",
      owner: "Founder",
      priority: "high",
    });
    const select = [...host.querySelectorAll("select")].find((s) =>
      [...s.options].some((o) => o.value === "complete"),
    )!;
    await act(async () => {
      select.value = "complete";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(
      usePortal.getState().data.missions.some((m) => m.status === "complete"),
    ).toBe(true);
  });
  it("preserves the actual observation time when editing evidence in local time", async () => {
    await act(async () => usePortal.setState({ data: populatedWorkspace() }));
    await show("compliance");
    await click("Edit evidence");
    await submit("Update audit record", { license: "MIT" });
    expect(usePortal.getState().data.compliance[0].observedAt).toBe(
      "2026-10-26T10:00:00.000Z",
    );
    expect(usePortal.getState().data.auditHistory).toHaveLength(2);
    expect(host.textContent).toContain("Audit history (2 revisions)");
  });
  it("exports workspace data, preserves recovery data and explicitly replaces valid imports", async () => {
    await show("executive");
    await click("Export Portal workspace");
    expect(download).toHaveBeenCalledWith(
      expect.stringContaining("version"),
      "portal-workspace.json",
    );
    await click("Import Portal workspace");
    const input = host.querySelector("input[type=file]") as HTMLInputElement;
    const upload = async (contents: string, size = contents.length) => {
      const file = new File([contents], "workspace.json", {
        type: "application/json",
      });
      Object.defineProperty(file, "text", { value: async () => contents });
      Object.defineProperty(file, "size", { value: size });
      Object.defineProperty(input, "files", {
        configurable: true,
        value: [file],
      });
      await act(async () =>
        input.dispatchEvent(new Event("change", { bubbles: true })),
      );
    };
    await upload("{bad");
    expect(host.textContent).toContain("Error:");
    await upload("", 2_000_001);
    expect(host.textContent).toContain("2 MB");
    const contents = exportWorkspace(populatedWorkspace());
    await upload(contents);
    await click("Cancel");
    expect(usePortal.getState().data.assets).toHaveLength(0);
    await upload(contents);
    await click("Replace workspace");
    expect(usePortal.getState().data.assets).toHaveLength(1);
    await act(async () =>
      usePortal.setState({ error: "Recovery", recovery: "{broken" }),
    );
    await click("Download original data");
    expect(download).toHaveBeenCalledWith(
      "{broken",
      "portal-original-data.txt",
      "text/plain",
    );
    await click("Replace saved copy");
    expect(usePortal.getState().recovery).toBeNull();
  });
  it("reports form callback failures accessibly and handles optional controls", async () => {
    await act(async () =>
      root.render(
        <RecordForm
          submit="Save"
          fields={[
            { name: "notes", label: "Notes", type: "textarea", optional: true },
            {
              name: "approved",
              label: "Approved",
              type: "checkbox",
              value: "on",
            },
          ]}
          onSubmit={() => {
            throw "Invalid input";
          }}
        />,
      ),
    );
    await submit("Save", {});
    expect(host.querySelector("[role=alert]")?.textContent).toBe(
      "Unable to save record.",
    );
  });
});
