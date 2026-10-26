import { create } from "zustand";
import { createId } from "../engine/id";
import type { DashboardId } from "../portal/navigation";

export interface CopilotReply {
  text: string;
  source: string;
  dashboard?: DashboardId;
  error?: boolean;
}
export interface ConversationMessage extends CopilotReply {
  id: string;
  role: "user" | "assistant";
}
export interface Conversation {
  id: string;
  title: string;
  messages: ConversationMessage[];
}
interface CopilotState {
  conversations: Conversation[];
  activeId: string | null;
  newConversation: () => void;
  select: (id: string) => void;
  remove: (id: string) => void;
  exchange: (prompt: string, reply: CopilotReply) => void;
}
/** Session-only transcripts. Keep at most 20 conversations and 20 exchanges each. */
export const useCopilot = create<CopilotState>((set) => ({
  conversations: [],
  activeId: null,
  newConversation: () => set({ activeId: null }),
  select: (id) =>
    set((state) =>
      state.conversations.some((c) => c.id === id) ? { activeId: id } : {},
    ),
  remove: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      activeId: state.activeId === id ? null : state.activeId,
    })),
  exchange: (prompt, reply) =>
    set((state) => {
      const current = state.conversations.find((c) => c.id === state.activeId);
      const conversation: Conversation = current ?? {
        id: createId(),
        title: prompt.slice(0, 60),
        messages: [],
      };
      const messages: ConversationMessage[] = [
        ...conversation.messages,
        { id: createId(), role: "user", text: prompt, source: "You" },
        { ...reply, id: createId(), role: "assistant" },
      ];
      return {
        activeId: conversation.id,
        conversations: [
          { ...conversation, messages: messages.slice(-40) },
          ...state.conversations.filter((c) => c.id !== conversation.id),
        ].slice(0, 20),
      };
    }),
}));
