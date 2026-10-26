import { useRef, useState } from "react";
import { ArrowUp, CornerDownLeft, Sparkles } from "lucide-react";
export function CopilotInput({ onSend }: { onSend: (prompt: string) => void }) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  function send() {
    if (!value.trim()) return;
    onSend(value.trim());
    setValue("");
    ref.current?.focus();
  }
  return (
    <form
      className="copilot-composer"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <label className="copilot-sr" htmlFor="copilot-prompt">
        Message Portal Copilot
      </label>
      <textarea
        id="copilot-prompt"
        ref={ref}
        value={value}
        maxLength={2000}
        rows={3}
        placeholder="Ask, explore, or make something happen…"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            send();
          }
        }}
      />
      <div className="copilot-composer-tools">
        <span>
          <Sparkles size={14} /> Workspace context{" "}
          <span className="copilot-dot" />
        </span>
        <div>
          <small>
            <CornerDownLeft size={12} /> to send
          </small>
          <button
            type="submit"
            disabled={!value.trim()}
            aria-label="Send message"
          >
            <ArrowUp size={19} />
          </button>
        </div>
      </div>
    </form>
  );
}
