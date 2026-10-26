import type { Identity } from "../../identity/types";
import { Empty, Rows } from "../../portal/DashboardUI";
import { Panel } from "../UI";

export default function AgentRegistry({
  identities,
  onSelect,
}: {
  identities: readonly Identity[];
  onSelect: (id: string) => void;
}) {
  const agents = identities.filter((identity) => identity.type === "agent");
  return (
    <Panel title="Agent registry" eyebrow="IDENTITY DIRECTORY">
      <p className="note">
        Registered agent identities are local records. Execution remains in
        Agent Command Center.
      </p>
      {agents.length === 0 ? (
        <Empty>No agent identities registered.</Empty>
      ) : (
        <Rows headers={["Agent", "Roles", "Capabilities"]}>
          {agents.map((agent) => (
            <tr key={agent.id}>
              <th scope="row">
                <button
                  className="button small"
                  onClick={() => onSelect(agent.id)}
                >
                  {agent.name}
                </button>
              </th>
              <td>{agent.roles.join(", ") || "Unassigned"}</td>
              <td>{agent.capabilities.length}</td>
            </tr>
          ))}
        </Rows>
      )}
    </Panel>
  );
}
