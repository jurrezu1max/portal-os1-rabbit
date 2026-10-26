import { useState } from "react";
import { MessageSquare, Search, Trash2 } from "lucide-react";
import { useCopilot } from "./CopilotContext";
export function CopilotHistory({ onSelect }: { onSelect: () => void }) {
  const { conversations, activeId, select, remove } = useCopilot();
  const [query, setQuery] = useState("");
  const matches = conversations.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section className="copilot-history" aria-label="Conversation history">
      <div className="copilot-nav-label">
        RECENT CONVERSATIONS <span>{conversations.length}</span>
      </div>
      <label className="copilot-search">
        <Search size={14} />
        <input
          aria-label="Search conversations"
          placeholder="Search conversations"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {!conversations.length && (
        <p>
          Your next idea starts here.
          <br />
          Conversations stay in this session.
        </p>
      )}
      {!!conversations.length && !matches.length && (
        <p>No conversations found.</p>
      )}
      {matches.map((c) => (
        <div
          key={c.id}
          className={`copilot-history-row ${c.id === activeId ? "selected" : ""}`}
        >
          <button
            aria-current={c.id === activeId ? "true" : undefined}
            onClick={() => {
              select(c.id);
              onSelect();
            }}
          >
            <MessageSquare size={14} />
            <span>{c.title}</span>
          </button>
          <button
            aria-label={`Delete conversation: ${c.title}`}
            onClick={() => remove(c.id)}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
    </section>
  );
}
