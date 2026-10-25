import { interpret } from "./commands";
import { createId } from "./id";
import { useWorkbench } from "../state/workbench";

/** Runs only the documented local commands; no generated text is executed. */
export function runWorkspaceCommand(
  prompt: string,
  selected: string | null,
  onFailure: (seeds: string[]) => void,
): string {
  const store = useWorkbench.getState();
  const cmd = interpret(prompt, store.graph, store.snapshots, selected);
  switch (cmd.kind) {
    case "add":
      store.addNode({ id: createId(), label: cmd.label, type: cmd.type });
      return `Created ${cmd.label} (${cmd.type}). Connect it to the architecture next.`;
    case "connect":
      store.addEdge(cmd.source, cmd.target);
      return "Connection created. Structural metrics updated.";
    case "save":
      store.save(cmd.name);
      return `Saved snapshot “${cmd.name}”.`;
    case "failure":
      onFailure(cmd.seeds);
      return "Started a failure simulation at a 50% neighbor-loss threshold. The working architecture is preserved until you apply the result.";
    case "reply":
      return cmd.text;
  }
}
