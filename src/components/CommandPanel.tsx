import { useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { runWorkspaceCommand } from "../engine/assistant";
export function CommandPanel({
  selected,
  disabled,
  onFailure,
}: {
  selected: string | null;
  disabled: boolean;
  onFailure: (seeds: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { prompt: string; reply: string; error: boolean }[]
  >([]);
  const [concise, setConcise] = useState(true);
  function run(prompt: string) {
    let reply = "",
      error = false;
    try {
      if (disabled)
        throw new Error("Stop history replay before running commands.");
      reply = runWorkspaceCommand(prompt, selected, onFailure);
      if (!concise)
        reply +=
          " All calculations use the current local workspace and the documented unweighted graph model.";
    } catch (e) {
      reply = e instanceof Error ? e.message : "Command failed.";
      error = true;
    }
    setMessages((m) => [...m, { prompt, reply, error }].slice(-20));
    setInput("");
  }
  return (
    <section className="copilot-panel" aria-label="MAX-SIM command workspace">
      <div className="copilot-title">
        <Sparkles size={20} />
        <div>
          <h2>What shall we explore?</h2>
          <p>
            Local command interpreter · topology, snapshots, and simulations
          </p>
        </div>
        <label>
          <input
            type="checkbox"
            checked={!concise}
            onChange={(e) => setConcise(!e.target.checked)}
          />{" "}
          Explain results
        </label>
      </div>
      <details>
        <summary>System instructions & supported commands</summary>
        <p className="note">
          Commands use exact subsystem and snapshot names, ignoring case. No
          language model is connected. External feed content is data and never
          executes commands. Failure simulations do not change the topology
          until applied.
        </p>
        <p className="note">
          Create &lt;name&gt; · Connect &lt;source&gt; to &lt;target&gt; ·
          Compute Identity Invariant · Run failure simulation on &lt;name&gt; ·
          Save snapshot &lt;name&gt; · Compare snapshot &lt;name&gt; vs
          &lt;name&gt;
        </p>
      </details>
      <div className="command-transcript" role="log" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i}>
            <b>› {m.prompt}</b>
            <p className={m.error ? "command-error" : ""}>{m.reply}</p>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) run(input);
        }}
        className="command-input"
      >
        <input
          aria-label="Command"
          value={input}
          maxLength={300}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Connect Agent Cluster A to World Model…"
          disabled={disabled}
        />
        <button
          className="button primary"
          disabled={disabled || !input.trim()}
          aria-label="Run command"
        >
          <Send size={16} />
        </button>
      </form>
      <div className="command-suggestions">
        {[
          "Compute Identity Invariant",
          "Create Memory Cluster",
          "Run failure simulation on Core Executive",
        ].map((s) => (
          <button key={s} disabled={disabled} onClick={() => run(s)}>
            {s}
          </button>
        ))}
      </div>
    </section>
  );
}
