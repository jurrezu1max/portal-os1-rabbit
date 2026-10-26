import { beforeEach, describe, expect, it, vi } from "vitest";
import { runCopilotAction } from "../copilot/CopilotActions";
import { useCopilot } from "../copilot/CopilotContext";
import { integrationSetup } from "./integration-fixtures";
import { newWorkspace } from "../portal/workspace";
import { useWorkbench } from "../state/workbench";
import { SAMPLE } from "../data/sample";
import { DASHBOARDS } from "../portal/navigation";
beforeEach(() => {
  useCopilot.setState({ conversations: [], activeId: null });
  useWorkbench.getState().replace(SAMPLE, "Copilot fixture");
});
describe("Copilot actions use existing systems", () => {
  it("reads live workspace changes and evidence without inventing data", () => {
    const { system, portal } = integrationSetup();
    const run = (prompt: string) => runCopilotAction(prompt, system, vi.fn());
    expect(run("Summarize my workspace").text).toContain(
      "2 identities, 1 registered assets and 1 market opportunities",
    );
    expect(run("Show market opportunities").text).toContain("Synthetic market");
    expect(run("Show market opportunities").text).toContain(
      "Source: Synthetic study A",
    );
    expect(run("Review compliance").text).toContain("Integration issues:");
    expect(run("Summarize my architecture").text).toContain("0 subsystems");
    portal.setState({ data: newWorkspace() });
    expect(run("Show market opportunities").text).toContain(
      "No market evidence yet",
    );
    expect(run("Summarize my workspace").text).toContain("Add goals");
    expect(run("Review compliance").dashboard).toBe("compliance");
    expect(run("Help").text).toContain("not connected");
  });
  it("executes connected agents and opens every existing dashboard", () => {
    const { system } = integrationSetup();
    for (const prompt of [
      "Run agents",
      "Run agents: review climate priorities",
    ]) {
      const response = runCopilotAction(prompt, system, vi.fn());
      expect(response.text).toContain("Founder agent");
      expect(response.text).toContain("Compliance agent");
      expect(system.getSnapshot().agents.every((a) => a.result)).toBe(true);
    }
    for (const d of DASHBOARDS)
      expect(
        runCopilotAction(`Open ${d.title}`, system, vi.fn()).dashboard,
      ).toBe(d.id);
  });
  it("routes supported graph commands and preserves failure simulation semantics", () => {
    const { system } = integrationSetup();
    const onFailure = vi.fn();
    const before = useWorkbench.getState().graph.nodes.length;
    expect(
      runCopilotAction("Create Copilot Memory", system, onFailure).text,
    ).toContain("Created Copilot Memory");
    expect(useWorkbench.getState().graph.nodes.length).toBe(before + 1);
    expect(
      runCopilotAction("Compute Identity Invariant", system, onFailure).text,
    ).toContain("Identity I(S)");
    const graph = useWorkbench.getState().graph;
    runCopilotAction(
      "Run failure simulation on Core Executive",
      system,
      onFailure,
    );
    expect(onFailure).toHaveBeenCalledOnce();
    expect(useWorkbench.getState().graph).toBe(graph);
    for (const input of [
      "",
      "x".repeat(2001),
      "Delete everything",
      "Open missing",
    ])
      expect(() => runCopilotAction(input, system, onFailure)).toThrow();
  });
});
describe("Copilot session history", () => {
  it("selects, bounds and deletes conversations without touching platform data", () => {
    const store = useCopilot.getState;
    store().exchange("first", { text: "response", source: "fixture" });
    const first = store().activeId!;
    store().newConversation();
    store().exchange("second", { text: "response", source: "fixture" });
    const second = store().activeId!;
    store().select("missing");
    expect(store().activeId).toBe(second);
    store().select(first);
    for (let i = 0; i < 25; i++)
      store().exchange("follow up", { text: "reply", source: "fixture" });
    expect(store().conversations[0].messages).toHaveLength(40);
    store().remove(second);
    expect(store().activeId).toBe(first);
    store().remove(first);
    expect(store().activeId).toBeNull();
    for (let i = 0; i < 25; i++) {
      store().newConversation();
      store().exchange(`conversation ${i}`, {
        text: "reply",
        source: "fixture",
      });
    }
    expect(store().conversations).toHaveLength(20);
    expect(store().conversations[0].title).toBe("conversation 24");
  });
});
