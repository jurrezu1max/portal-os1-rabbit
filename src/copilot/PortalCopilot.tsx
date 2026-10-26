import { useEffect, useRef } from "react";
import {
  ArrowUpRight,
  Compass,
  Layers3,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { portalSystem } from "../integration/system";
import { usePortalSystem } from "../integration/usePortalSystem";
import type { DashboardId } from "../portal/navigation";
import type { Page } from "../types";
import { CopilotLayout } from "./CopilotLayout";
import { CopilotInput } from "./CopilotInput";
import { CopilotMessage } from "./CopilotMessage";
import { useCopilot } from "./CopilotContext";
import { COPILOT_SUGGESTIONS, runCopilotAction } from "./CopilotActions";
import "./copilot.css";
const icons = {
  overview: Layers3,
  markets: Compass,
  agents: Users,
  compliance: ShieldCheck,
};
export default function PortalCopilot({
  navigate,
  onFailure,
}: {
  navigate: (page: DashboardId | Page) => void;
  onFailure: (seeds: string[]) => void;
}) {
  const state = usePortalSystem();
  const { conversations, activeId, exchange } = useCopilot();
  const conversation = conversations.find((c) => c.id === activeId);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (conversation?.messages.length)
      endRef.current?.scrollIntoView({
        block: "nearest",
        behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")
          .matches
          ? "auto"
          : "smooth",
      });
  }, [conversation]);
  function send(prompt: string) {
    try {
      exchange(prompt, runCopilotAction(prompt, portalSystem, onFailure));
    } catch (error) {
      exchange(prompt, {
        text:
          error instanceof Error
            ? error.message
            : "Unable to complete that request. Please try again.",
        source: "Portal Copilot · command feedback",
        error: true,
      });
    }
  }
  return (
    <CopilotLayout
      navigate={navigate}
      name={state.profile.name}
      issues={state.issues.length + (state.error ? 1 : 0)}
    >
      {state.error && (
        <p className="copilot-storage-error" role="alert">
          {state.error} Open Founder Console to recover system connections.
        </p>
      )}
      <main
        id="main"
        tabIndex={-1}
        className={`copilot-content ${conversation ? "has-conversation" : ""}`}
      >
        {!conversation ? (
          <div className="copilot-welcome">
            <div className="copilot-intro">
              <div className="copilot-orbit">
                <Sparkles size={32} strokeWidth={1.4} />
              </div>
              <div className="copilot-eyebrow">
                YOUR WORKSPACE. ONE CONVERSATION.
              </div>
              <h1>
                A little clarity.
                <br />
                <span>A world of possibility.</span>
              </h1>
              <p>
                Connect the dots. Explore what’s next.
                <br />
                Move your ideas forward with Portal Copilot.
              </p>
              <div className="copilot-context-pill">
                <span className="copilot-dot" /> Connected to your workspace{" "}
                <span>·</span> Local intelligence
              </div>
            </div>
            <div className="copilot-suggestions">
              {COPILOT_SUGGESTIONS.map((s) => {
                const Icon = icons[s.kind];
                return (
                  <button key={s.kind} onClick={() => send(s.prompt)}>
                    <span className={`copilot-suggestion-icon ${s.kind}`}>
                      <Icon size={19} />
                    </span>
                    <ArrowUpRight
                      className="copilot-suggestion-arrow"
                      size={15}
                    />
                    <strong>{s.title}</strong>
                    <small>{s.detail}</small>
                  </button>
                );
              })}
            </div>
            <div className="copilot-try">
              <span>Or try</span>
              <button onClick={() => send("Summarize my architecture")}>
                “Summarize my architecture”
              </button>
              <button onClick={() => send("Open Founder Console")}>
                “Open Founder Console”
              </button>
            </div>
          </div>
        ) : (
          <section className="copilot-transcript" aria-label="Conversation">
            <div className="copilot-conversation-title">
              <Sparkles size={16} />
              <h1>{conversation.title}</h1>
              <span>SESSION</span>
            </div>
            <div role="log" aria-live="polite" aria-relevant="additions">
              {conversation.messages.map((message) => (
                <CopilotMessage
                  key={message.id}
                  message={message}
                  navigate={navigate}
                />
              ))}
            </div>
            <div ref={endRef} />
          </section>
        )}
        <div className="copilot-input-area">
          <CopilotInput key={activeId ?? "new"} onSend={send} />
          <p>
            Grounded in your workspace. Powered by local commands.
            <button onClick={() => send("Help")}>What can I ask?</button>
          </p>
        </div>
      </main>
      <footer className="copilot-footer">
        <span>
          <span className="copilot-dot" /> PORTAL-OS ALPHA <i>/</i> Built for
          what comes next.
        </span>
        <span>Think clearly. Build intentionally.</span>
      </footer>
    </CopilotLayout>
  );
}
