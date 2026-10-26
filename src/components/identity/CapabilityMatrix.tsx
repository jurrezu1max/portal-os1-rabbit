import { useState } from "react";
import type { Capability, Identity } from "../../identity/types";
import type { IdentityRegistry } from "../../identity/registry";
import { capabilityVector } from "../../identity/vectors";
import { RecordForm } from "../../portal/forms";
import { Empty, Rows } from "../../portal/DashboardUI";
import { Panel } from "../UI";

export default function CapabilityMatrix({
  catalog,
  identity,
  registry,
  onAction,
}: {
  catalog: readonly Capability[];
  identity: Identity | undefined;
  registry: IdentityRegistry;
  onAction: (action: () => void) => void;
}) {
  const [editing, setEditing] = useState<Capability | null>(null);
  const vector = identity && capabilityVector(identity, catalog);
  return (
    <Panel title="Capability matrix" eyebrow="PROFICIENCY · 0–100">
      <p className="note">
        Proficiency belongs to each catalog entry and is shared by its assigned
        identities. Select an identity to manage assignments.
      </p>
      <RecordForm
        key={editing?.id ?? "new"}
        submit={editing ? "Save capability" : "Create capability"}
        fields={[
          { name: "id", label: "Capability ID", value: editing?.id },
          { name: "name", label: "Capability name", value: editing?.name },
          { name: "category", label: "Category", value: editing?.category },
          {
            name: "proficiency",
            label: "Proficiency (0–100)",
            type: "number",
            min: 0,
            max: 100,
            value: String(editing?.proficiency ?? 0),
          },
        ]}
        onSubmit={(values) => {
          if (
            !editing &&
            catalog.some((capability) => capability.id === values.id.trim())
          )
            throw new Error(
              "Capability ID already exists. Use Edit to update it.",
            );
          if (editing && values.id.trim() !== editing.id)
            throw new Error(
              "Capability IDs cannot be changed. Create a new entry instead.",
            );
          registry.saveCapability({
            ...values,
            id: values.id,
            name: values.name,
            category: values.category,
            proficiency: Number(values.proficiency),
          });
          setEditing(null);
        }}
      />
      {editing && (
        <button className="button small" onClick={() => setEditing(null)}>
          Cancel capability edit
        </button>
      )}
      {catalog.length === 0 ? (
        <Empty>No capabilities yet. Create a catalog entry to assign it.</Empty>
      ) : (
        <Rows
          headers={[
            "Capability",
            "Category",
            "Proficiency",
            "Assigned",
            "Actions",
          ]}
        >
          {catalog.map((capability) => (
            <tr key={capability.id}>
              <th scope="row">
                {capability.name}
                <small className="identity-id">{capability.id}</small>
              </th>
              <td>{capability.category}</td>
              <td>
                <progress
                  value={capability.proficiency}
                  max={100}
                  aria-label={`${capability.name} proficiency`}
                />{" "}
                {capability.proficiency}
              </td>
              <td>
                <label className="identity-assignment">
                  <input
                    type="checkbox"
                    disabled={!identity}
                    checked={
                      identity?.capabilities.includes(capability.id) ?? false
                    }
                    onChange={
                      identity
                        ? (event) =>
                            onAction(() => {
                              if (event.target.checked)
                                registry.assignCapability(
                                  identity.id,
                                  capability.id,
                                );
                              else
                                registry.revokeCapability(
                                  identity.id,
                                  capability.id,
                                );
                            })
                        : undefined
                    }
                  />
                  <span>{`Assign ${capability.name}`}</span>
                </label>
              </td>
              <td>
                <div className="button-row">
                  <button
                    className="button small"
                    onClick={() => setEditing(capability)}
                  >
                    Edit {capability.name}
                  </button>
                  <button
                    className="button small"
                    onClick={() =>
                      onAction(() => {
                        registry.removeCapability(capability.id);
                        setEditing(null);
                      })
                    }
                  >
                    Delete {capability.name}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Rows>
      )}
      {vector && (
        <p className="note identity-vector">
          Capability vector for {identity.name}:{" "}
          {vector.dimensions
            .map((id, index) => `${id}=${vector.values[index]}`)
            .join(" · ") || "No dimensions"}
          . Values use proficiency / 100; unassigned axes are zero.
        </p>
      )}
    </Panel>
  );
}
