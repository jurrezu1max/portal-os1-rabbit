import { ROLES } from "../../identity/roles";
import type { Identity } from "../../identity/types";
import type { IdentityRegistry } from "../../identity/registry";
import { Panel } from "../UI";

export default function RoleManager({
  identity,
  registry,
  onAction,
}: {
  identity: Identity;
  registry: IdentityRegistry;
  onAction: (action: () => void) => void;
}) {
  return (
    <Panel title="Role manager" eyebrow={identity.name}>
      <p className="note">
        Roles describe responsibilities. Permission enforcement is a future
        integration.
      </p>
      <div className="identity-roles">
        {ROLES.map((role) => (
          <label key={role}>
            <input
              type="checkbox"
              checked={identity.roles.includes(role)}
              onChange={(event) =>
                onAction(() => {
                  if (event.target.checked)
                    registry.assignRole(identity.id, role);
                  else registry.revokeRole(identity.id, role);
                })
              }
            />
            <span>{role}</span>
          </label>
        ))}
      </div>
    </Panel>
  );
}
