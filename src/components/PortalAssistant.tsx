import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Code2,
  Copy,
  GitBranch,
  Layers3,
  Network,
  Plus,
  ShieldCheck,
  Sparkles,
  Waves,
  X,
} from "lucide-react";
import type { Page } from "../types";
import { useWorkbench } from "../state/workbench";
import { StructuralInvariant } from "../engine/metrics";
import { runWorkspaceCommand } from "../engine/assistant";

type Message = { role: "user" | "assistant"; text: string; error?: boolean };
const starters = [
  {
    icon: Network,
    color: "mint",
    title: "Explore my architecture",
    detail: "Understand the system behind your ideas",
    prompt: "Summarize my architecture",
  },
  {
    icon: Waves,
    color: "violet",
    title: "Measure structural identity",
    detail: "Look deeper into your topology",
    prompt: "Compute Identity Invariant",
  },
  {
    icon: GitBranch,
    color: "blue",
    title: "Build something new",
    detail: "Add a subsystem to your workspace",
    prompt: "Create Memory Cluster",
  },
  {
    icon: ShieldCheck,
    color: "amber",
    title: "Test system resilience",
    detail: "Explore a safe failure simulation",
    prompt: "Run failure simulation on Core Executive",
  },
];
const layers = [
  "Max-Math",
  "Max-Physics",
  "Core Suites",
  "Portal-OS",
  "Umbrella Marketplace",
];

export function PortalAssistant({
  onNavigate,
  onFailure,
}: {
  onNavigate: (page: Page) => void;
  onFailure: (seeds: string[]) => void;
}) {
  const { graph, snapshots, recovery } = useWorkbench();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [help, setHelp] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [copyError, setCopyError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const key = JSON.stringify({
    nodes: graph.nodes.map((n) => n.id),
    edges: graph.edges,
  });
  const metrics = useMemo(() => new StructuralInvariant(graph).metrics, [key]);
  useEffect(() => {
    if (messages.length)
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);
  function send(prompt: string) {
    const text = prompt.trim();
    if (!text) return;
    let reply: string;
    let error = false;
    try {
      if (/^(summarize my architecture|hello|hi|help)$/i.test(text)) {
        reply = `Your workspace has ${graph.nodes.length} subsystems and ${graph.edges.length} connections across ${metrics.components.length} communication region${metrics.components.length === 1 ? "" : "s"}. Structural identity I(S) is ${metrics.identity.toFixed(4)} and spectral entropy is ${metrics.entropy.toFixed(3)} bits. You can compute identity, create a subsystem, connect nodes, save snapshots, or run a failure simulation. Open Command Center to explore the topology.`;
      } else if (
        /^(explain (the )?(umbrella|layers|invariant)|what is portal-os)\??$/i.test(
          text,
        )
      ) {
        reply =
          "The Umbrella manifest describes five layers: Max-Math, Max-Physics, Core Suites, Portal-OS, and Umbrella Marketplace. Its det(J) = 1.0000 is a design target. This local workspace measures graph identity using Laplacian eigenvalues; it does not verify Jacobian preservation. Cloudflare execution, model-backed agents, and sovereign asset licensing require backend implementation.";
      } else {
        reply = runWorkspaceCommand(text, null, onFailure);
      }
    } catch (e) {
      error = true;
      reply =
        e instanceof Error ? e.message : "The command could not be completed.";
    }
    setMessages((current) =>
      [
        ...current,
        { role: "user" as const, text },
        { role: "assistant" as const, text: reply, error },
      ].slice(-40),
    );
    setInput("");
    setCopied(null);
    setCopyError("");
  }
  async function copy(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(index);
      setCopyError("");
    } catch {
      setCopyError(
        "Copy is unavailable in this browser. Select the response text to copy it.",
      );
    }
  }
  return (
    <div className="portal-layout">
      <section
        className="portal-conversation"
        aria-label="Portal assistant workspace"
      >
        <div className="portal-section-bar">
          <span>
            <span className="portal-live-dot" /> PERSONAL WORKSPACE
          </span>
          <button
            onClick={() => {
              setMessages([]);
              setCopied(null);
              setCopyError("");
              setInput("");
              inputRef.current?.focus();
            }}
          >
            <Plus size={14} /> New conversation
          </button>
        </div>
        <div
          className={`portal-welcome ${messages.length ? "has-messages" : ""}`}
        >
          <div className="portal-orbit" aria-hidden="true">
            <Sparkles size={29} strokeWidth={1.4} />
          </div>
          <div className="portal-overline">
            A LITTLE CURIOSITY. LIMITLESS POSSIBILITY.
          </div>
          <h1>
            Your ideas. <span>A whole new dimension.</span>
          </h1>
          <p>
            Think, build, and explore with Portal.
            <br />
            Your ecosystem starts with a conversation.
          </p>
          <div className="portal-assistant-pill">
            <span className="portal-live-dot" /> Bemax workspace <span>·</span>{" "}
            Local assistant
          </div>
        </div>
        {!messages.length && (
          <div className="portal-starters">
            {starters.map((item) => (
              <button key={item.title} onClick={() => send(item.prompt)}>
                <span className={`starter-icon ${item.color}`}>
                  <item.icon size={19} />
                </span>
                <ArrowUp size={14} className="starter-arrow" />
                <b>{item.title}</b>
                <span>{item.detail}</span>
              </button>
            ))}
          </div>
        )}
        {messages.length > 0 && (
          <div
            className="portal-messages"
            role="log"
            aria-live="polite"
            aria-label="Conversation"
          >
            {messages.map((message, i) => (
              <article
                className={`portal-message ${message.role} ${message.error ? "is-error" : ""}`}
                key={i}
              >
                <span className="message-avatar">
                  {message.role === "assistant" ? <Sparkles size={16} /> : "MX"}
                </span>
                <div>
                  <b>{message.role === "assistant" ? "Portal" : "You"}</b>
                  <p>{message.text}</p>
                  {message.role === "assistant" && (
                    <button
                      className="portal-copy"
                      onClick={() => void copy(message.text, i)}
                      aria-label="Copy response"
                    >
                      {copied === i ? <Check size={13} /> : <Copy size={13} />}
                      {copied === i ? "Copied" : "Copy"}
                    </button>
                  )}
                </div>
              </article>
            ))}
            <div ref={endRef} />
          </div>
        )}
        {copyError && <p role="status">{copyError}</p>}
        <form
          className="portal-composer"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <textarea
            ref={inputRef}
            aria-label="Message Portal"
            placeholder="Where would you like to take your ideas?"
            value={input}
            maxLength={300}
            rows={2}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                send(input);
              }
            }}
          />
          <div className="composer-toolbar">
            <button
              type="button"
              className="composer-context"
              onClick={() => onNavigate("Topology")}
            >
              <Layers3 size={14} /> Workspace context{" "}
              <span>{graph.nodes.length}</span>
            </button>
            <div>
              <span className="local-model">
                <Sparkles size={12} /> Portal Local
              </span>
              <button
                className="portal-send"
                disabled={!input.trim()}
                aria-label="Send message"
              >
                <ArrowUp size={18} />
              </button>
            </div>
          </div>
        </form>
        <div className="portal-disclosure">
          <span>
            Local commands · no language model connected · conversations are
            session-only
          </span>
          <button onClick={() => setHelp((v) => !v)} aria-expanded={help}>
            <CircleHelp size={13} /> What can I ask?
          </button>
        </div>
        {help && (
          <div className="portal-help">
            <button
              aria-label="Close command help"
              onClick={() => setHelp(false)}
            >
              <X size={15} />
            </button>
            <b>A few ways to get started</b>
            <p>
              Use full subsystem names, ignoring case. Enter sends; Shift +
              Enter adds a line.
            </p>
            {[
              "Summarize my architecture",
              "Explain the layers",
              "Create Memory Cluster",
              "Connect Agent Cluster A to World Model",
              "Save snapshot my checkpoint",
            ].map((prompt) => (
              <button
                className="help-command"
                key={prompt}
                onClick={() => send(prompt)}
              >
                {prompt}
                <ArrowRight size={12} />
              </button>
            ))}
          </div>
        )}
        {!messages.length && (
          <div className="portal-explore">
            <div className="portal-subheading">
              <h2>Made for your next big idea</h2>
              <span>EXPLORE YOUR ECOSYSTEM</span>
            </div>
            <div className="portal-destinations">
              <button onClick={() => onNavigate("Topology")}>
                <div className="destination-art topology-art">
                  <Network size={54} strokeWidth={1} />
                  <span className="art-node one" />
                  <span className="art-node two" />
                </div>
                <div>
                  <b>See the bigger picture</b>
                  <p>Explore your living architecture</p>
                </div>
                <ArrowRight size={17} />
              </button>
              <button onClick={() => onNavigate("Intelligence feed")}>
                <div className="destination-art knowledge-art">
                  <BookOpen size={48} strokeWidth={1} />
                  <Sparkles size={18} />
                </div>
                <div>
                  <b>Follow your curiosity</b>
                  <p>Discover signals and new perspectives</p>
                </div>
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        )}
      </section>
      <aside className="portal-context" aria-label="Workspace context">
        <div className="context-heading">
          <span>YOUR ECOSYSTEM</span>
          <Layers3 size={15} />
        </div>
        <div className="context-planet">
          <div className="planet-grid" />
          <div className="planet-ring" />
          <span>U</span>
        </div>
        <h2>Umbrella workspace</h2>
        <p>A connected space for every idea.</p>
        <div className="context-local">
          <span className="portal-live-dot" />{" "}
          {recovery ? "Recovery · saving paused" : "Local workspace active"}
        </div>
        <div className="context-stats">
          <div>
            <strong>{graph.nodes.length}</strong>
            <span>Subsystems</span>
          </div>
          <div>
            <strong>{graph.edges.length}</strong>
            <span>Connections</span>
          </div>
          <div>
            <strong>{snapshots.length}</strong>
            <span>Snapshots</span>
          </div>
        </div>
        <div className="context-heading context-layer-title">
          <span>ARCHITECTURE BLUEPRINT</span>
          <span>5 LAYERS</span>
        </div>
        <div className="context-layers">
          {layers.map((layer, i) => (
            <div key={layer}>
              <span>0{i + 1}</span>
              <Layers3 size={14} />
              <b>{layer}</b>
              {i < layers.length - 1 && (
                <ArrowDown className="layer-connector" size={10} />
              )}
            </div>
          ))}
        </div>
        <div className="invariant-note">
          <ShieldCheck size={17} />
          <div>
            <b>Preservation by design</b>
            <p>det(J) = 1.0000</p>
            <span>Manifest target · not verified</span>
          </div>
        </div>
        <button className="context-open" onClick={() => onNavigate("Topology")}>
          Open Command Center <ChevronRight size={15} />
        </button>
        <div className="context-tip">
          <Code2 size={18} />
          <b>From thought to structure.</b>
          <p>
            Start with a question. Create a subsystem. See your ecosystem take
            shape.
          </p>
        </div>
      </aside>
    </div>
  );
}
