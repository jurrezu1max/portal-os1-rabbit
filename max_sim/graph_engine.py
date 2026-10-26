"""Load the MAX-SIM undirected subsystem topology."""

import json
from pathlib import Path

import networkx as nx

TOPOLOGY_PATH = Path(__file__).resolve().parent / "data" / "topology.json"


def build_maxsim(path: Path = TOPOLOGY_PATH) -> nx.Graph:
    """Build a fresh graph from the topology file, including subsystem metadata."""
    topology = json.loads(Path(path).read_text(encoding="utf-8"))
    graph = nx.Graph()
    for node in topology["nodes"]:
        graph.add_node(node["id"], group=node["group"], color=node["color"])
    for source, target in topology["edges"]:
        if source not in graph or target not in graph:
            raise ValueError(f"Edge references an unknown subsystem: {source}, {target}")
        graph.add_edge(source, target)
    return graph


def scenario(graph: nx.Graph, disabled: list[str]) -> nx.Graph:
    """Return an independent scenario. Never mutate the live or baseline topology."""
    unknown = set(disabled).difference(graph.nodes)
    if unknown:
        raise ValueError("Scenario contains unknown subsystem IDs")
    result = graph.copy()
    result.remove_nodes_from(disabled)
    return result


def evolve_network(graph: nx.Graph, connections: list[tuple[str, str]]) -> nx.Graph:
    """Apply a proposed sequence of simple connections to a copy, atomically."""
    result = graph.copy()
    for source, target in connections:
        if source not in result or target not in result:
            raise ValueError("Evolution references unknown subsystem IDs")
        if source == target or result.has_edge(source, target):
            raise ValueError("Evolution requires new connections between distinct nodes")
        result.add_edge(source, target)
    return result
