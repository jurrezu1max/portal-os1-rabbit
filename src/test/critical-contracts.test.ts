import { describe, expect, it } from "vitest";
import {
  validateGraph,
  neighbors,
  components,
  copyGraph,
  removeNodes,
} from "../engine/graph";
import { interpret } from "../engine/commands";
import { runWorkspaceCommand } from "../engine/assistant";
import { useWorkbench } from "../state/workbench";
import { SAMPLE } from "../data/sample";
import type { Architecture, Snapshot } from "../types";
const graph: Architecture = {
  nodes: [
    { id: "a", label: "Alpha", type: "Agent" },
    { id: "b", label: "Beta", type: "Memory", x: 0, y: 2 },
  ],
  edges: [{ source: "a", target: "b" }],
};
describe("critical graph boundary coverage", () => {
  it("rejects every malformed public shape before changing state", () => {
    for (const input of [
      null,
      false,
      1,
      "",
      {},
      { directed: true },
      { nodes: [], edges: {} },
      { nodes: {}, edges: [] },
    ])
      expect(() => validateGraph(input)).toThrow();
    for (const node of [
      null,
      "a",
      {},
      { id: 1 },
      { id: "" },
      { id: "x".repeat(101) },
      { id: "a", label: 1 },
      { id: "a", label: "" },
      { id: "a", label: "x".repeat(101) },
      { id: "a", label: "A", type: "Other" },
    ])
      expect(() => validateGraph({ nodes: [node], edges: [] })).toThrow();
    for (const coordinate of ["1", NaN, Infinity, 10001, -10001])
      for (const key of ["x", "y"])
        expect(() =>
          validateGraph({
            nodes: [{ id: "a", label: "A", type: "Agent", [key]: coordinate }],
            edges: [],
          }),
        ).toThrow();
    for (const edge of [
      null,
      "a",
      {},
      { source: 1, target: "b" },
      { source: "a", target: 2 },
      { source: "a", target: "missing" },
      { source: "missing", target: "b" },
      { source: "a", target: "b", weight: "1" },
      { source: "a", target: "b", weight: 2 },
      { source: "a", target: "b", directed: true },
    ])
      expect(() => validateGraph({ ...graph, edges: [edge] })).toThrow();
    expect(
      validateGraph({
        ...graph,
        directed: false,
        edges: [{ source: "a", target: "b", directed: false, weight: 1 }],
      }),
    ).toEqual(graph);
    const copied = copyGraph(graph);
    copied.nodes[0].label = "Changed";
    expect(graph.nodes[0].label).toBe("Alpha");
    expect(neighbors(graph).get("a")).toEqual(new Set(["b"]));
    expect(
      components({
        ...graph,
        nodes: [...graph.nodes, { id: "c", label: "C", type: "Agent" }],
        edges: graph.edges,
      }),
    ).toEqual([["a", "b"], ["c"]]);
    expect(removeNodes(graph, new Set(["a"]))).toEqual({
      nodes: [graph.nodes[1]],
      edges: [],
    });
    expect(removeNodes(graph, new Set(["b"]))).toEqual({
      nodes: [graph.nodes[0]],
      edges: [],
    });
    expect(validateGraph({ nodes: [], edges: [] })).toEqual({
      nodes: [],
      edges: [],
    });
  });
});
describe("critical command branches", () => {
  it("keeps quoting, type selection, lengths and selected-node validation", () => {
    for (const [name, type] of [
      ["Memory Module", "Memory"],
      ["Agent Z", "Agent"],
      ["Executive Z", "Executive"],
      ["Planning Z", "Cognition"],
      ["World Z", "Cognition"],
      ["Cognition Z", "Cognition"],
      ["Router Z", "Infrastructure"],
    ])
      expect(interpret(`Create "${name}"`, graph, [], null)).toEqual({
        kind: "add",
        label: name,
        type,
      });
    expect(() => interpret('Create ""', graph, [], null)).toThrow("between");
    expect(() =>
      interpret(`Create ${"x".repeat(101)}`, graph, [], null),
    ).toThrow("between");
    expect(() => interpret("Create Alpha", graph, [], null)).toThrow("already");
    expect(() =>
      interpret("Run failure simulation", graph, [], "missing"),
    ).toThrow("Select");
    expect(
      interpret('Run failure simulation on "Alpha"', graph, [], null),
    ).toEqual({ kind: "failure", seeds: ["a"] });
    expect(interpret('Save snapshot "Release"', graph, [], null)).toEqual({
      kind: "save",
      name: "Release",
    });
    const empty: Snapshot = {
      id: "1",
      name: "empty",
      timestamp: "2026-10-26T00:00:00Z",
      nodes: [],
      edges: [],
    };
    const filled: Snapshot = {
      ...graph,
      id: "2",
      name: "filled",
      timestamp: empty.timestamp,
    };
    expect(
      interpret("Compare empty vs filled", graph, [empty, filled], null),
    ).toMatchObject({ text: expect.stringContaining("fidelity N/A") });
    expect(() =>
      interpret("Compare missing vs filled", graph, [filled], null),
    ).toThrow("exactly one");
    expect(() =>
      interpret("Compare filled vs filled", graph, [filled, filled], null),
    ).toThrow("exactly one");
    expect(() =>
      interpret("Compare filled vs missing", graph, [filled], null),
    ).toThrow("exactly one");
  });
  it("returns reply actions through the assistant unchanged", () => {
    useWorkbench.getState().replace(SAMPLE, "Test");
    expect(
      runWorkspaceCommand("Compute Identity Invariant", null, () => {}),
    ).toContain("48.0000");
  });
});
