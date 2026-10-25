import { beforeEach, describe, expect, it } from "vitest";
import { runWorkspaceCommand } from "../engine/assistant";
import { SAMPLE } from "../data/sample";
import { useWorkbench } from "../state/workbench";

beforeEach(() => {
  useWorkbench.getState().replace(SAMPLE, "Assistant test fixture");
});

describe("assistant workspace actions", () => {
  it("creates and connects actual subsystems through validated store operations", () => {
    expect(runWorkspaceCommand("Create Test Memory", null, () => {})).toContain(
      "Created",
    );
    const node = useWorkbench
      .getState()
      .graph.nodes.find((n) => n.label === "Test Memory")!;
    expect(node.type).toBe("Memory");
    runWorkspaceCommand("Connect Test Memory to World Model", null, () => {});
    expect(useWorkbench.getState().graph.edges).toContainEqual({
      source: node.id,
      target: "World Model",
    });
  });

  it("saves a recoverable snapshot of the current graph", () => {
    const graph = useWorkbench.getState().graph;
    runWorkspaceCommand("Save snapshot Assistant checkpoint", null, () => {});
    expect(useWorkbench.getState().snapshots.at(-1)).toMatchObject({
      name: "Assistant checkpoint",
      nodes: graph.nodes,
      edges: graph.edges,
    });
  });

  it("launches failure previews without mutating the graph", () => {
    const before = structuredClone(useWorkbench.getState().graph);
    let seeds: string[] = [];
    runWorkspaceCommand(
      "Run failure simulation on Core Executive",
      null,
      (value) => {
        seeds = value;
      },
    );
    expect(seeds).toEqual(["Core Executive"]);
    expect(useWorkbench.getState().graph).toEqual(before);
  });

  it("rejects unsupported and invalid commands without changing workspace state", () => {
    const before = useWorkbench.getState();
    expect(() =>
      runWorkspaceCommand("Delete everything", null, () => {}),
    ).toThrow("Supported commands");
    expect(() =>
      runWorkspaceCommand("Connect Core Executive to Missing", null, () => {}),
    ).toThrow("not found");
    expect(useWorkbench.getState()).toBe(before);
  });
});
