import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  Box,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Download,
  FlaskConical,
  GitBranch,
  Layers3,
  Link2,
  Menu,
  Network,
  Plus,
  Radio,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  Waves,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Page, SubsystemType } from "./types";
import { COLORS, GROUPS } from "./types";
import { useWorkbench } from "./state/workbench";
import { SAMPLE } from "./data/sample";
import { createId } from "./engine/id";
import { StructuralInvariant, compare } from "./engine/metrics";
import {
  exportCSV,
  exportJSON,
  parseArchitecture,
  download,
  exportImage,
} from "./engine/io";
import { GraphView, NodePicker } from "./components/GraphView";
import { LineChart, Gauge } from "./components/Charts";
import { Panel, Metric, TextLink, number } from "./components/UI";
import { SpectralPanel } from "./components/SpectralPanel";
import { EvolutionPanel, HistoryChart } from "./components/EvolutionPanel";
import { FailurePanel } from "./components/FailurePanel";
import { TranslationPanel } from "./components/TranslationPanel";
import { ResearchPanel } from "./components/ResearchPanel";
import { PortalAssistant } from "./components/PortalAssistant";
import { CommandPanel } from "./components/CommandPanel";
import { IntelligenceFeed } from "./components/IntelligenceFeed";
import { MediaCenter } from "./components/MediaCenter";
const navigation: {
  page: Page;
  label: string;
  icon: LucideIcon;
  shortcut: string;
}[] = [
  {
    page: "Portal assistant",
    label: "Portal Assistant",
    icon: Sparkles,
    shortcut: "⌘",
  },
  { page: "Topology", label: "Command Center", icon: Network, shortcut: "01" },
  {
    page: "Architecture evolution",
    label: "Evolution Lab",
    icon: GitBranch,
    shortcut: "02",
  },
  {
    page: "Failure simulator",
    label: "Failure Simulator",
    icon: ShieldAlert,
    shortcut: "03",
  },
];
navigation.push(
  {
    page: "Intelligence feed",
    label: "Intelligence Feed",
    icon: Radio,
    shortcut: "04",
  },
  { page: "Media center", label: "Media Center", icon: Camera, shortcut: "05" },
);
const advanced: { page: Page; label: string; icon: LucideIcon }[] = [
  { page: "Spectral analysis", label: "Spectral Analysis", icon: Waves },
  { page: "Translation lab", label: "Translation Lab", icon: Layers3 },
  { page: "Research mode", label: "Structural Manifold", icon: FlaskConical },
];
const headings: Record<Page, { title: string; description: string }> = {
  "Portal assistant": {
    title: "Portal Assistant",
    description: "Your workspace for structural intelligence.",
  },
  "Intelligence feed": {
    title: "Intelligence Feed",
    description: "Bring public observations into your architecture research.",
  },
  "Media center": {
    title: "Media Center",
    description: "Watch, learn, and follow architecture experiments.",
  },
  Topology: {
    title: "Command Center",
    description:
      "Explore, measure, and orchestrate your cognitive architecture.",
  },
  "Architecture evolution": {
    title: "Evolution Lab",
    description:
      "Shape your architecture. Capture a moment. Trace every change.",
  },
  "Failure simulator": {
    title: "Failure Simulator",
    description:
      "Stress-test subsystem dependencies and watch failures propagate.",
  },
  "Spectral analysis": {
    title: "Spectral Analysis",
    description:
      "Inspect the mathematical structure beneath your architecture.",
  },
  "Translation lab": {
    title: "Translation Lab",
    description: "Measure what an architecture transformation preserves.",
  },
  "Research mode": {
    title: "Structural Manifold",
    description: "Explore experimental MAX Calculus dynamics in state space.",
  },
};
function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        const box = e.currentTarget.getBoundingClientRect();
        const outside =
          e.clientX < box.left ||
          e.clientX > box.right ||
          e.clientY < box.top ||
          e.clientY > box.bottom;
        if (e.target === e.currentTarget && outside) onClose();
      }}
      aria-label={title}
    >
      <div className="dialog-heading">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={19} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export default function App() {
  const store = useWorkbench(),
    { graph, snapshots, history, baselineId, notice } = store;
  const [page, setPage] = useState<Page>("Portal assistant"),
    [research, setResearch] = useState(false),
    [mobileNav, setMobileNav] = useState(false);
  const [selected, setSelected] = useState<string | null>("Core Executive"),
    [modal, setModal] = useState<"node" | "snapshot" | null>(null),
    [nodeName, setNodeName] = useState(""),
    [nodeType, setNodeType] = useState<SubsystemType>("Agent"),
    [snapshotName, setSnapshotName] = useState("");
  const [source, setSource] = useState(""),
    [target, setTarget] = useState(""),
    [connectMode, setConnectMode] = useState(false),
    [connectSource, setConnectSource] = useState<string | null>(null);
  const [replay, setReplay] = useState<number | null>(null),
    [replayRunning, setReplayRunning] = useState(false);
  const [failureRequest, setFailureRequest] = useState<{
    seeds: string[];
    id: number;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null),
    svgRef = useRef<SVGSVGElement>(null);
  const active =
    replay === null ? graph : history[Math.min(replay, history.length - 1)];
  // Layout changes don't invalidate numerical analysis.
  const topologyKey = JSON.stringify({
    nodes: active.nodes.map((n) => n.id),
    edges: active.edges,
  });
  const metrics = useMemo(
    () => new StructuralInvariant(active).metrics,
    [topologyKey],
  );
  const baseline = snapshots.find((s) => s.id === baselineId) ?? snapshots[0];
  const baselineMetrics = useMemo(
    () => new StructuralInvariant(baseline).metrics,
    [baseline],
  );
  const differential = useMemo(
    () => compare(baseline, active),
    [baseline, topologyKey],
  );
  const node = active.nodes.find((n) => n.id === selected),
    connected = active.edges.filter(
      (e) => e.source === selected || e.target === selected,
    );
  const live = active.nodes.filter((n) => metrics.degree[n.id] > 0).length;
  const onError = (error: unknown) =>
    store.setNotice(
      `Error: ${error instanceof Error ? error.message : "The operation could not be completed."}`,
    );
  const safe = (fn: () => void) => {
    try {
      fn();
    } catch (e) {
      onError(e);
    }
  };
  const go = (next: Page) => {
    setFailureRequest(null);
    setPage(next);
    setMobileNav(false);
    if (next !== "Topology" && next !== "Architecture evolution") {
      setReplay(null);
      setReplayRunning(false);
    }
  };
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => store.setNotice(""), 6500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!replayRunning) return;
    const timer = setInterval(
      () =>
        setReplay((current) => {
          const next = (current ?? -1) + 1;
          if (next >= history.length) {
            setReplayRunning(false);
            return history.length - 1;
          }
          return next;
        }),
      1100,
    );
    return () => clearInterval(timer);
  }, [replayRunning, history.length]);
  const stopReplay = () => {
    setReplayRunning(false);
    setReplay(null);
  };
  function selectNode(id: string) {
    setSelected(id);
    if (connectMode && replay === null) {
      if (connectSource) {
        safe(() => store.addEdge(connectSource, id));
        setConnectSource(null);
        setConnectMode(false);
      } else setConnectSource(id);
    }
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error("Import is limited to 2 MB.");
      const data = parseArchitecture(
        await file.text(),
        file.name.split(".").pop()!.toLowerCase(),
      );
      store.replace(data, `Imported ${file.name.slice(0, 70)}`);
      setSelected(null);
      setSource("");
      setTarget("");
    } catch (e) {
      onError(e);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  const openSave = () => {
    if (replay !== null) {
      store.setNotice("Stop replay before saving a snapshot.");
      return;
    }
    setSnapshotName(`Architecture ${snapshots.length + 1}`);
    setModal("snapshot");
  };
  const editor = (
    <div className="edit-panel">
      <div className="editor-title">
        <SlidersHorizontal size={15} />
        <h3>Topology controls</h3>
        <span className="tag">LIVE</span>
      </div>
      <button
        className="button"
        disabled={replay !== null}
        onClick={() => setModal("node")}
      >
        <Plus size={15} /> Add subsystem
      </button>
      <div className="edge-form">
        <NodePicker
          graph={graph}
          value={source}
          onChange={setSource}
          label="Source"
        />
        <NodePicker
          graph={graph}
          value={target}
          onChange={setTarget}
          label="Target"
        />
        <button
          className="button"
          disabled={!source || !target || replay !== null}
          onClick={() =>
            safe(() => {
              store.addEdge(source, target);
              setSource("");
              setTarget("");
            })
          }
        >
          <Link2 size={14} /> Connect nodes
        </button>
      </div>
    </div>
  );
  const inspector = (
    <Panel
      title="Subsystem inspector"
      eyebrow={node ? "SELECTED SUBSYSTEM" : "SELECT A NODE"}
      action={<Box size={17} className="muted" />}
    >
      {node ? (
        <>
          <div className="inspector-name">
            <span
              style={{
                color: COLORS[node.type],
                background: `${COLORS[node.type]}15`,
              }}
            >
              <Box size={20} />
            </span>
            <div>
              <h3>{node.label}</h3>
              <small>{node.type} subsystem</small>
            </div>
          </div>
          <div className="inspector-stats">
            <div>
              <span>DEGREE</span>
              <strong>{metrics.degree[node.id]}</strong>
            </div>
            <div>
              <span>CENTRALITY</span>
              <strong>{number(metrics.centrality[node.id], 3)}</strong>
            </div>
          </div>
          <div className="health-line">
            <span
              className={
                metrics.degree[node.id] ? "status-dot" : "status-dot warning"
              }
            />
            {metrics.degree[node.id]
              ? "Connected to architecture"
              : "Isolated subsystem"}
          </div>
          {research && (
            <>
              <div className="detail-row">
                <span>Betweenness</span>
                <b>{number(metrics.betweenness[node.id], 4)}</b>
              </div>
              <div className="detail-row">
                <span>Graph diameter</span>
                <b>{number(metrics.diameter, 0)}</b>
              </div>
            </>
          )}
          <h4 className="small-heading">
            Connections <span>{connected.length}</span>
          </h4>
          <div className="connection-list">
            {connected.length ? (
              connected.map((e) => {
                const other = e.source === node.id ? e.target : e.source;
                return (
                  <div key={other}>
                    <span>
                      <CircleDot size={11} />
                      {active.nodes.find((n) => n.id === other)?.label}
                    </span>
                    <button
                      aria-label={`Remove connection to ${other}`}
                      title={`Remove connection to ${other}`}
                      disabled={replay !== null}
                      onClick={() => store.deleteEdge(e.source, e.target)}
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="note">No connections yet.</p>
            )}
          </div>
          <button
            className="delete-node"
            disabled={replay !== null}
            onClick={() => {
              store.deleteNode(node.id);
              setSelected(null);
            }}
          >
            <Trash2 size={13} /> Remove subsystem
          </button>
        </>
      ) : (
        <div className="empty-state">
          <Box size={26} />
          <p>Select a subsystem in the topology or use the list below.</p>
        </div>
      )}
      <NodePicker
        graph={active}
        value={node?.id ?? ""}
        onChange={selectNode}
        label="Find subsystem"
      />
    </Panel>
  );
  const topology = (
    <Panel
      title="Architecture topology"
      eyebrow="FORCE-DIRECTED NETWORK"
      className="topology-panel"
      action={
        <div className="button-row">
          <button
            className={`button small ${connectMode ? "selected-button" : ""}`}
            disabled={replay !== null}
            onClick={() => {
              setConnectMode((v) => !v);
              setConnectSource(null);
            }}
          >
            <Link2 size={13} />
            <span>Connect</span>
          </button>
          <button
            className="button small"
            disabled={replay !== null}
            onClick={() => setModal("node")}
          >
            <Plus size={14} />
            <span>Add node</span>
          </button>
        </div>
      }
    >
      {connectMode && (
        <div className="connect-banner">
          {connectSource
            ? `Now select a target for ${graph.nodes.find((n) => n.id === connectSource)?.label ?? connectSource}`
            : "Select a source node, then a target node to create a connection."}
          <button
            onClick={() => {
              setConnectMode(false);
              setConnectSource(null);
            }}
          >
            Cancel
          </button>
        </div>
      )}
      <GraphView
        graph={active}
        layoutKey={
          replay === null
            ? history.at(-1)?.id
            : history[Math.min(replay, history.length - 1)].id
        }
        metrics={metrics}
        selected={selected}
        onSelect={selectNode}
        onPosition={store.position}
        readOnly={replay !== null}
        connectSource={connectSource}
        svgRef={svgRef}
      />
    </Panel>
  );
  return (
    <div
      className={`app-shell ${page === "Portal assistant" ? "portal-shell" : ""}`}
    >
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("Portal assistant");
          }}
        >
          <div className="brand-mark">
            <Activity size={28} />
          </div>
          <div>
            <strong>
              PORTAL<span>–</span>OS
            </strong>
            <small>UMBRELLA ECOSYSTEM</small>
          </div>
        </a>
        <div className="workspace-label">
          <span className="workspace-icon">
            <Layers3 size={16} />
          </span>
          <div>
            <b>Research workspace</b>
            <span>Local environment</span>
          </div>
          <ChevronDown size={13} />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Primary navigation">
          {navigation.map((item) => (
            <button
              key={item.page}
              className={`nav-item ${page === item.page ? "active" : ""}`}
              onClick={() => go(item.page)}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              <small>{item.shortcut}</small>
            </button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <label className="research-switch">
          <FlaskConical size={17} />
          <span>Research mode</span>
          <input
            type="checkbox"
            role="switch"
            checked={research}
            onChange={(e) => {
              setResearch(e.target.checked);
              if (!e.target.checked && advanced.some((p) => p.page === page))
                go("Topology");
            }}
          />
          <i />
        </label>
        <p className="sidebar-note">
          Advanced analysis & experimental calculus
        </p>
        {research && (
          <nav aria-label="Research tools">
            {advanced.map((item) => (
              <button
                key={item.page}
                className={`nav-item ${page === item.page ? "active" : ""}`}
                onClick={() => go(item.page)}
              >
                <item.icon size={17} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        )}
        <div className="sidebar-spacer" />
        <div className="workspace-status">
          <span className="status-dot" />
          <span>WORKSPACE READY</span>
          <Radio size={13} />
        </div>
        <div className="sidebar-bottom">
          <div className="avatar">MX</div>
          <div>
            <b>MAX-SIM Research</b>
            <span>Workbench v2.0</span>
          </div>
          <Sparkles size={15} />
        </div>
      </aside>
      {mobileNav && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}
      <div className="workspace-main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setMobileNav((v) => !v)}
            >
              <Menu size={19} />
            </button>
            <span className="breadcrumb-home">
              <Layers3 size={14} /> Workspace
            </span>
            <ChevronRight size={12} />
            <span>{headings[page].title}</span>
          </div>
          <div className="topbar-right">
            <span className="local-status">
              <span className="status-dot" /> LOCAL WORKSPACE
            </span>
            <span className="topbar-divider" />
            <div className="avatar small">MX</div>
          </div>
        </header>
        <main id="main">
          {page !== "Portal assistant" && (
            <div className="page-heading">
              <div>
                <div className="heading-eyebrow">
                  <span /> MAX-SIM / STRUCTURAL INTELLIGENCE
                </div>
                <h1>
                  {headings[page].title}
                  <span className="version-tag">v2.0</span>
                </h1>
                <p>{headings[page].description}</p>
              </div>
              <div className="page-actions">
                <button
                  className="button"
                  disabled={replay !== null}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload size={14} /> Import
                </button>
                <details className="export-menu">
                  <summary className="button">
                    <Download size={14} /> Export
                    <ChevronDown size={12} />
                  </summary>
                  <div>
                    {(["JSON", "CSV", "SVG", "PNG"] as const).map((format) => (
                      <button
                        key={format}
                        disabled={
                          (format === "SVG" || format === "PNG") &&
                          !["Topology", "Architecture evolution"].includes(page)
                        }
                        onClick={(e) => {
                          e.currentTarget
                            .closest("details")
                            ?.removeAttribute("open");
                          if (format === "JSON")
                            download(
                              exportJSON(active),
                              "max-sim-architecture.json",
                            );
                          else if (format === "CSV")
                            download(
                              exportCSV(active),
                              "max-sim-architecture.csv",
                              "text/csv",
                            );
                          else if (svgRef.current)
                            void exportImage(
                              svgRef.current,
                              format.toLowerCase() as "svg" | "png",
                            ).catch(onError);
                        }}
                      >
                        {format === "SVG" || format === "PNG"
                          ? "Topology image"
                          : "Architecture"}{" "}
                        .{format.toLowerCase()}
                      </button>
                    ))}
                  </div>
                </details>
                <button
                  className="button primary"
                  disabled={replay !== null}
                  onClick={openSave}
                >
                  <Camera size={14} /> Save snapshot
                </button>
              </div>
            </div>
          )}
          <input
            hidden
            ref={fileRef}
            type="file"
            accept=".json,.csv,.graphml,.xml"
            onChange={(e) => void importFile(e.target.files?.[0])}
          />
          {replay !== null && (
            <div className="replay-banner">
              <PlayIcon />
              <span>
                EVOLUTION REPLAY · T{replay} · {history[replay]?.name}
              </span>
              <input
                aria-label="Replay position"
                type="range"
                min="0"
                max={history.length - 1}
                value={replay}
                onChange={(e) => {
                  setReplayRunning(false);
                  setReplay(Number(e.target.value));
                }}
              />
              <button onClick={stopReplay}>
                Return to live architecture <X size={13} />
              </button>
            </div>
          )}
          {store.recovery && (
            <div className="notice-banner recovery-banner" role="alert">
              <ShieldAlert size={18} />
              <span>
                Saved workspace could not be read. The original data is
                preserved; current changes stay in memory until you replace the
                saved copy.
              </span>
              <button
                className="button"
                disabled={store.recovery.raw === null}
                onClick={() => {
                  if (
                    store.recovery?.raw !== null &&
                    store.recovery?.raw !== undefined
                  )
                    download(store.recovery.raw, "max-sim-recovery.json");
                }}
              >
                <Download size={14} /> Download saved data
              </button>
              <button
                className="button danger"
                onClick={store.replaceSavedWorkspace}
              >
                Replace saved copy
              </button>
            </div>
          )}
          <div hidden={page !== "Portal assistant"}>
            <PortalAssistant
              onNavigate={go}
              onFailure={(seeds) => {
                go("Failure simulator");
                setFailureRequest({ seeds, id: Date.now() });
              }}
            />
          </div>
          {page !== "Portal assistant" && (
            <>
              <CommandPanel
                selected={selected}
                disabled={replay !== null}
                onFailure={(seeds) => {
                  go("Failure simulator");
                  setFailureRequest({ seeds, id: Date.now() });
                }}
              />
              <div className="metrics-grid">
                <Metric
                  label="Identity Invariant"
                  value={number(metrics.identity)}
                  unit="I(S)"
                  caption="Structural identity"
                  help="Sum of positive Laplacian eigenvalues; equals twice the edge count for this simple unweighted graph."
                />
                <Metric
                  label="Structural Drift"
                  value={`${differential.drift > 1e-8 ? "+" : ""}${number(differential.drift)}`}
                  unit="Dᵢ"
                  caption="Relative to baseline"
                  accent="#6aabff"
                  help="Current identity minus selected baseline identity."
                />
                <Metric
                  label="Structural Fidelity"
                  value={number(differential.fidelity, 3)}
                  unit="Fₜ"
                  caption="Invariant retention ratio"
                  accent="#ac9aff"
                  help="Current identity divided by baseline identity. Undefined for zero baseline identity; may exceed one."
                />
                <Metric
                  label="Translation Loss"
                  value={number(differential.loss, 3)}
                  unit="bits"
                  caption="Spectral entropy difference"
                  accent="#edbe72"
                  help="Baseline spectral entropy minus current spectral entropy. A negative value indicates entropy gain."
                />
              </div>
              <div className="architecture-bar">
                <div>
                  <span className="status-dot" />
                  <strong>
                    {replay !== null ? "History preview" : "Live architecture"}
                  </strong>
                  <span className="bar-divider" />
                  <span>{active.nodes.length} nodes</span>
                  <span>{active.edges.length} edges</span>
                </div>
                <div>
                  <span>
                    λ₂ <b>{number(metrics.connectivity, 3)}</b>
                  </span>
                  <span>
                    ρ(A) <b>{number(metrics.radius, 3)}</b>
                  </span>
                  <label>
                    Baseline{" "}
                    <select
                      aria-label="Comparison baseline"
                      value={baselineId}
                      onChange={(e) => store.setBaseline(e.target.value)}
                    >
                      {snapshots.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
              <motion.div
                key={page}
                initial={{ opacity: 0, y: 7 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {page === "Topology" && (
                  <>
                    <div className="command-grid">
                      <div className="command-left">
                        {topology}
                        <div className="two-column bottom-panels">
                          <Panel
                            title="Spectral overview"
                            eyebrow="LAPLACIAN EIGENVALUES"
                            action={
                              <TextLink
                                onClick={() => {
                                  setResearch(true);
                                  go("Spectral analysis");
                                }}
                              >
                                Analyze
                              </TextLink>
                            }
                          >
                            <LineChart
                              labels={metrics.eigenvalues.map((_, i) => i)}
                              series={[
                                {
                                  name: "Eigenvalue λ",
                                  values: metrics.eigenvalues,
                                  color: "#4bdfbc",
                                },
                              ]}
                              height={155}
                            />
                          </Panel>
                          <Panel
                            title="Subsystem health"
                            eyebrow="TOPOLOGY-BASED STATUS"
                          >
                            <Gauge
                              value={
                                active.nodes.length
                                  ? live / active.nodes.length
                                  : 0
                              }
                              label={`${live} / ${active.nodes.length} connected`}
                              detail={`${metrics.components.length} communication region${metrics.components.length === 1 ? "" : "s"}`}
                            />
                            <div className="health-summary">
                              <span>
                                <i className="status-dot" /> Connected{" "}
                                <b>{live}</b>
                              </span>
                              <span>
                                <i className="status-dot warning" /> Isolated{" "}
                                <b>{active.nodes.length - live}</b>
                              </span>
                            </div>
                            <p className="note">
                              Structural connectivity proxy; no external health
                              telemetry.
                            </p>
                          </Panel>
                        </div>
                      </div>
                      <div className="command-right">
                        {inspector}
                        <div className="insight-card">
                          <div>
                            <ShieldAlert size={17} />
                            <span>STRESS-TEST YOUR DESIGN</span>
                          </div>
                          <h3>How resilient is your architecture?</h3>
                          <p>
                            Inject a subsystem failure and inspect the cascade.
                          </p>
                          <button onClick={() => go("Failure simulator")}>
                            Open failure simulator <ArrowUpRight size={15} />
                          </button>
                        </div>
                        {editor}
                      </div>
                    </div>
                    <Panel
                      title="Architecture evolution"
                      eyebrow={`${history.length} RECORDED EVENTS`}
                      action={
                        <TextLink onClick={() => go("Architecture evolution")}>
                          Open evolution lab
                        </TextLink>
                      }
                    >
                      <HistoryChart />
                    </Panel>
                  </>
                )}
                {page === "Architecture evolution" && (
                  <div className="page-stack">
                    <div className="command-grid">
                      <div>{topology}</div>
                      <div>
                        {editor}
                        {inspector}
                      </div>
                    </div>
                    <EvolutionPanel
                      onSave={openSave}
                      onReplay={() => {
                        setReplay(0);
                        setReplayRunning(true);
                      }}
                      replaying={replay !== null}
                      onStop={stopReplay}
                      onError={onError}
                    />
                  </div>
                )}
                {page === "Failure simulator" && (
                  <FailurePanel
                    key={failureRequest?.id ?? "manual"}
                    initialSeeds={failureRequest?.seeds}
                    autoRun={!!failureRequest}
                  />
                )}

                {page === "Spectral analysis" && (
                  <SpectralPanel graph={active} metrics={metrics} />
                )}
                {page === "Translation lab" && (
                  <TranslationPanel onError={onError} />
                )}
                {page === "Research mode" && (
                  <ResearchPanel metrics={metrics} baseline={baselineMetrics} />
                )}
              </motion.div>
              <div hidden={page !== "Intelligence feed"}>
                <IntelligenceFeed onTopology={() => go("Topology")} />
              </div>
            </>
          )}
          <MediaCenter
            visible={page === "Media center"}
            onPlayback={() => go("Failure simulator")}
          />
          <footer>
            <span>
              <Activity size={13} /> MAX-SIM <span className="muted">/</span>{" "}
              STRUCTURAL ARCHITECTURE WORKBENCH
            </span>
            <button
              disabled={replay !== null}
              onClick={() => {
                store.replace(SAMPLE, "Loaded sample architecture");
                setSelected("Core Executive");
              }}
            >
              Load sample architecture
            </button>
            <span>
              RESEARCH BUILD <i /> v2.0
            </span>
          </footer>
        </main>
      </div>
      <AnimatePresence>
        {notice && (
          <motion.div
            className={`toast ${notice.startsWith("Error:") ? "error" : ""}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            role={notice.startsWith("Error:") ? "alert" : "status"}
          >
            {notice.startsWith("Error:") ? (
              <ShieldAlert size={17} />
            ) : (
              <Check size={17} />
            )}
            <span>{notice}</span>
            <button
              aria-label="Dismiss notification"
              onClick={() => store.setNotice("")}
            >
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {modal === "node" && (
        <Dialog title="Add subsystem" onClose={() => setModal(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              safe(() => {
                const label = nodeName.trim();
                if (!label) throw new Error("Enter a subsystem name.");
                const id = createId();
                store.addNode({ id, label, type: nodeType });
                setSelected(id);
                setNodeName("");
                setModal(null);
              });
            }}
          >
            <label className="field">
              <span>Subsystem name</span>
              <input
                autoFocus
                required
                maxLength={100}
                value={nodeName}
                onChange={(e) => setNodeName(e.target.value)}
                placeholder="e.g. Reasoning Engine"
              />
            </label>
            <label className="field">
              <span>Subsystem type</span>
              <select
                value={nodeType}
                onChange={(e) => setNodeType(e.target.value as SubsystemType)}
              >
                {GROUPS.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </label>
            <p className="note">
              New subsystems start isolated. Connect them to the architecture
              using the graph or topology controls.
            </p>
            <button className="button primary" type="submit">
              <Plus size={14} /> Create subsystem
            </button>
          </form>
        </Dialog>
      )}
      {modal === "snapshot" && (
        <Dialog
          title="Save architecture snapshot"
          onClose={() => setModal(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              safe(() => {
                store.save(snapshotName);
                setModal(null);
              });
            }}
          >
            <label className="field">
              <span>Snapshot name</span>
              <input
                autoFocus
                required
                maxLength={100}
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
              />
            </label>
            <div className="snapshot-preview">
              <Network size={22} />
              <div>
                <strong>
                  {graph.nodes.length} subsystems · {graph.edges.length}{" "}
                  connections
                </strong>
                <span>Topology, subsystem metadata, and saved positions</span>
              </div>
            </div>
            <p className="note">
              Saved in this browser. Export snapshots to keep a portable backup.
            </p>
            <button className="button primary" type="submit">
              <Camera size={14} /> Save snapshot
            </button>
          </form>
        </Dialog>
      )}
    </div>
  );
}
function PlayIcon() {
  return <span className="replay-indicator">▶</span>;
}
