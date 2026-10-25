export const GROUPS = [
  "Executive",
  "Memory",
  "Agent",
  "Infrastructure",
  "Cognition",
] as const;
export type SubsystemType = (typeof GROUPS)[number];
export interface ArchitectureNode {
  id: string;
  label: string;
  type: SubsystemType;
  x?: number;
  y?: number;
}
export interface ArchitectureEdge {
  source: string;
  target: string;
}
export interface Architecture {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
}
export interface Snapshot extends Architecture {
  id: string;
  timestamp: string;
  name: string;
}
export interface Metrics {
  identity: number;
  connectivity: number;
  radius: number;
  entropy: number;
  density: number;
  diameter: number | null;
  clustering: number;
  components: string[][];
  degree: Record<string, number>;
  centrality: Record<string, number>;
  betweenness: Record<string, number>;
  adjacency: number[][];
  laplacian: number[][];
  eigenvalues: number[];
  eigenvectors: number[][];
  signature: string;
}
export const COLORS: Record<SubsystemType, string> = {
  Executive: "#58a8ff",
  Memory: "#edbe72",
  Agent: "#45dfbd",
  Infrastructure: "#a195ff",
  Cognition: "#5cdbec",
};
export type Page =
  | "Portal assistant"
  | "Intelligence feed"
  | "Media center"
  | "Topology"
  | "Spectral analysis"
  | "Architecture evolution"
  | "Failure simulator"
  | "Translation lab"
  | "Research mode";
