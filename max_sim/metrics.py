"""Structural measures of an undirected, unweighted topology."""

import networkx as nx
import numpy as np


class StructuralInvariant:
    def __init__(self, graph: nx.Graph):
        self.graph = graph

    def spectrum(self) -> np.ndarray:
        if not self.node_count():
            return np.array([], dtype=float)
        laplacian = nx.laplacian_matrix(self.graph).toarray()
        return np.sort(np.linalg.eigvalsh(laplacian))

    def identity(self) -> float:
        """Sum positive Laplacian eigenvalues; equals 2|E| for this graph model."""
        eigenvalues = self.spectrum()
        return float(np.sum(eigenvalues[eigenvalues > 1e-8]))

    def connectivity(self) -> float:
        """Return the Fiedler value, or zero for fewer than two nodes."""
        if self.node_count() < 2:
            return 0.0
        if not nx.is_connected(self.graph):
            return 0.0
        return max(0.0, float(self.spectrum()[1]))

    def node_count(self) -> int:
        return self.graph.number_of_nodes()

    def edge_count(self) -> int:
        return self.graph.number_of_edges()

    def laplacian_spectrum(self) -> np.ndarray:
        return self.spectrum()

    def identity_invariant(self) -> float:
        return self.identity()

    def spectral_entropy(self) -> float:
        """Shannon entropy of normalized positive Laplacian eigenvalues, in bits."""
        values = self.spectrum()
        values = values[values > 1e-8]
        total = float(values.sum())
        if total == 0:
            return 0.0
        probabilities = values / total
        return float(-np.sum(probabilities * np.log2(probabilities)))

    def translation_loss(self, target: "StructuralInvariant") -> float:
        return self.spectral_entropy() - target.spectral_entropy()

    def structural_fidelity(self, target: "StructuralInvariant") -> float | None:
        identity = self.identity()
        return target.identity() / identity if identity > 1e-8 else None

    def structural_drift(self, target: "StructuralInvariant") -> float:
        return target.identity() - self.identity()

    def scenario_forecast(self, scenarios: list[nx.Graph]) -> list[dict[str, float | int | None]]:
        """Measure explicit scenario steps relative to this baseline, not future certainty.

        No fitted growth rate or real-world causal prediction is implied.
        """
        results = []
        for step, graph in enumerate(scenarios, start=1):
            target = StructuralInvariant(graph)
            results.append({
                "step": step,
                "nodes": target.node_count(),
                "edges": target.edge_count(),
                "identity": target.identity(),
                "connectivity": target.connectivity(),
                "drift": self.structural_drift(target),
                "fidelity": self.structural_fidelity(target),
                "entropy_loss": self.translation_loss(target),
            })
        return results
