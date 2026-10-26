import { useState, useSyncExternalStore } from "react";
import {
  identityRegistry,
  type IdentityRegistry,
} from "../../identity/registry";
import type { Identity } from "../../identity/types";
import { RecordForm } from "../../portal/forms";
import { Empty, Rows, Stat } from "../../portal/DashboardUI";
import { download } from "../../engine/io";
import { Panel } from "../UI";
import RoleManager from "./RoleManager";
import CapabilityMatrix from "./CapabilityMatrix";
import AgentRegistry from "./AgentRegistry";

export default function IdentityDashboard({
  registry = identityRegistry,
}: {
  registry?: IdentityRegistry;
}) {
  const snapshot = useSyncExternalStore(
    registry.subscribe,
    registry.getSnapshot,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const selected = snapshot.identities.find(
    (identity) => identity.id === selectedId,
  );
  const filtered = snapshot.identities.filter((identity) =>
    `${identity.name} ${identity.id} ${identity.type}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  function action(fn: () => void) {
    try {
      fn();
      setNotice("Registry updated.");
    } catch (error) {
      setNotice(
        `Error: ${error instanceof Error ? error.message : "Operation failed."}`,
      );
    }
  }
  return (
    <section
      className="portal-dashboard identity-dashboard"
      aria-label="Identity Dashboard"
    >
      <div className="portal-workspace-bar">
        <div>
          <h2>Identity Registry</h2>
          <p className="note">
            People, agents, and organizations · saved in this browser
          </p>
        </div>
        <button
          className="button small"
          onClick={() =>
            download(registry.exportRegistry(), "portal-identities.json")
          }
        >
          Export identity registry
        </button>
      </div>
      {snapshot.error && (
        <div className="notice-banner" role="alert">
          <span>{snapshot.error}</span>
          {snapshot.recovery !== null && (
            <button
              className="button"
              onClick={() =>
                download(
                  snapshot.recovery!,
                  "portal-identities-original.txt",
                  "text/plain",
                )
              }
            >
              Download original identities
            </button>
          )}
          <button
            className="button"
            onClick={() => action(registry.replaceSaved)}
          >
            Replace saved identities
          </button>
        </div>
      )}
      <p
        className="portal-notice"
        role={notice.startsWith("Error:") ? "alert" : "status"}
      >
        {notice}
      </p>
      <div className="portal-stats">
        <Stat
          title="Identities"
          value={String(snapshot.identities.length)}
          detail="Registered local records"
        />
        <Stat
          title="Humans"
          value={String(
            snapshot.identities.filter((identity) => identity.type === "human")
              .length,
          )}
          detail="People in your workspace"
        />
        <Stat
          title="Agents"
          value={String(
            snapshot.identities.filter((identity) => identity.type === "agent")
              .length,
          )}
          detail="Agent identity records"
        />
        <Stat
          title="Organizations"
          value={String(
            snapshot.identities.filter(
              (identity) => identity.type === "organization",
            ).length,
          )}
          detail="Teams and organizations"
        />
      </div>
      <Panel title="Register identity" eyebrow="IDENTITY FOUNDATION">
        <RecordForm
          key={snapshot.error}
          submit="Register identity"
          fields={[
            { name: "name", label: "Identity name" },
            {
              name: "type",
              label: "Identity type",
              options: ["human", "agent", "organization"],
            },
          ]}
          onSubmit={(values) => {
            const identity = registry.registerIdentity({
              name: values.name,
              type: values.type as Identity["type"],
            });
            setSelectedId(identity.id);
          }}
        />
      </Panel>
      <Panel title="Identity directory" eyebrow="REGISTRY">
        <label className="field identity-search">
          <span>Search identities</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        {filtered.length === 0 ? (
          <Empty>
            No matching identities. Register a person, agent, or organization to
            begin.
          </Empty>
        ) : (
          <Rows
            headers={["Identity", "Type", "Roles", "Capabilities", "Actions"]}
          >
            {filtered.map((identity) => (
              <tr
                key={identity.id}
                className={
                  selectedId === identity.id ? "identity-selected" : undefined
                }
              >
                <th scope="row">
                  {identity.name}
                  <small className="identity-id">{identity.id}</small>
                </th>
                <td>{identity.type}</td>
                <td>{identity.roles.join(", ") || "Unassigned"}</td>
                <td>{identity.capabilities.length}</td>
                <td>
                  <div className="button-row">
                    <button
                      className="button small"
                      aria-pressed={selectedId === identity.id}
                      onClick={() => setSelectedId(identity.id)}
                    >
                      Manage {identity.name}
                    </button>
                    <button
                      className="button small"
                      onClick={() =>
                        action(() => {
                          registry.removeIdentity(identity.id);
                        })
                      }
                    >
                      Remove {identity.name}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Rows>
        )}
      </Panel>
      {selected ? (
        <>
          <Panel title="Identity details" eyebrow={selected.type}>
            <p className="note identity-id">
              {selected.id} · Created {selected.createdAt} · Updated{" "}
              {selected.updatedAt}
            </p>
            <RecordForm
              key={selected.id}
              submit="Save identity"
              fields={[
                { name: "name", label: "Display name", value: selected.name },
                {
                  name: "type",
                  label: "Record type",
                  options: ["human", "agent", "organization"],
                  value: selected.type,
                },
              ]}
              onSubmit={(values) => {
                registry.updateIdentity(selected.id, {
                  name: values.name,
                  type: values.type as Identity["type"],
                });
              }}
            />
          </Panel>
          <RoleManager
            identity={selected}
            registry={registry}
            onAction={action}
          />
        </>
      ) : (
        <p className="note">
          Select Manage in the directory to edit an identity and its
          assignments.
        </p>
      )}
      <CapabilityMatrix
        key={snapshot.error}
        catalog={snapshot.capabilities}
        identity={selected}
        registry={registry}
        onAction={action}
      />
      <AgentRegistry
        identities={snapshot.identities}
        onSelect={setSelectedId}
      />
    </section>
  );
}
