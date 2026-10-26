import { useState } from "react";
import { ArrowUpRight, Check, Copy, Sparkles } from "lucide-react";
import type { ConversationMessage } from "./CopilotContext";
import { DASHBOARDS, type DashboardId } from "../portal/navigation";
export function CopilotMessage({
  message,
  navigate,
}: {
  message: ConversationMessage;
  navigate: (page: DashboardId) => void;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  return (
    <article
      className={`copilot-message ${message.role}`}
      aria-label={message.role === "user" ? "Your message" : "Copilot response"}
    >
      <div className="copilot-message-avatar">
        {message.role === "assistant" ? <Sparkles size={17} /> : "Y"}
      </div>
      <div className="copilot-message-body">
        <strong>
          {message.role === "assistant" ? "Portal Copilot" : "You"}
        </strong>
        <p role={message.error ? "alert" : undefined}>{message.text}</p>
        {message.role === "assistant" && (
          <>
            <small className="copilot-source">{message.source}</small>
            {message.dashboard && (
              <button
                className="copilot-open"
                onClick={() => navigate(message.dashboard!)}
              >
                Open {DASHBOARDS.find((d) => d.id === message.dashboard)?.title}
                <ArrowUpRight size={14} />
              </button>
            )}
            <button
              className="copilot-copy"
              aria-label="Copy response"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(message.text);
                  setCopyState("copied");
                } catch {
                  setCopyState("error");
                }
              }}
            >
              {copyState === "copied" ? (
                <Check size={13} />
              ) : (
                <Copy size={13} />
              )}
              {copyState === "copied" ? "Copied" : "Copy"}
            </button>
            {copyState === "error" && (
              <small role="status">
                Copy unavailable. Select the response text to copy it.
              </small>
            )}
          </>
        )}
      </div>
    </article>
  );
}
