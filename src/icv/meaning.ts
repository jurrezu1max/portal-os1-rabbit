/** Deterministic lexicon matching. Relationships are explicit co-mentions, not inferred causality. */
const lexicon: Record<string, string[]> = {
  markets: ["market", "revenue", "customer", "growth"],
  research: ["research", "evidence", "study", "knowledge"],
  compliance: ["privacy", "copyright", "license", "risk"],
  infrastructure: ["infrastructure", "network", "graph", "platform"],
  climate: ["climate", "carbon", "energy"],
  education: ["education", "learning", "school"],
};
export interface Meaning {
  entities: string[];
  classifications: string[];
  relationships: { source: string; target: string; kind: "co-mention" }[];
  tokens: string[];
}
export function extractMeaning(input: string): Meaning {
  const tokens = [
    ...new Set(input.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []),
  ];
  const classifications = Object.entries(lexicon)
    .filter(([, words]) => words.some((word) => tokens.includes(word)))
    .map(([domain]) => domain);
  const entities = tokens.filter((token) =>
    Object.values(lexicon).some((words) => words.includes(token)),
  );
  return {
    tokens,
    entities,
    classifications,
    relationships: entities
      .slice(1)
      .map((target) => ({ source: entities[0], target, kind: "co-mention" })),
  };
}
