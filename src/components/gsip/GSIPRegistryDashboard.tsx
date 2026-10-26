import { useState, useSyncExternalStore } from "react";
import {
  assetRegistry,
  type AssetRegistry,
} from "../../gsip/registry/assetRegistry";
import { ASSET_STATUSES, type AssetStatus } from "../../gsip/registry/types";
import {
  identityRegistry,
  type IdentityRegistry,
} from "../../identity/registry";
import { RecordForm, type Field } from "../../portal/forms";
import { Stat, Empty, Rows } from "../../portal/DashboardUI";
import { Panel } from "../UI";
import { download } from "../../engine/io";
import AssetTable from "./AssetTable";
import LicenseManager from "./LicenseManager";
import RevenueTracker from "./RevenueTracker";
export default function GSIPRegistryDashboard({
  registry = assetRegistry,
  identities = identityRegistry,
}: {
  registry?: AssetRegistry;
  identities?: IdentityRegistry;
}) {
  const snapshot = useSyncExternalStore(
    registry.subscribe,
    registry.getSnapshot,
  );
  const owners = useSyncExternalStore(
    identities.subscribe,
    identities.getSnapshot,
  ).identities;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [notice, setNotice] = useState("");
  const selected = snapshot.assets.find((asset) => asset.id === selectedId);
  const metrics = registry.getMetrics();
  const ownerOptions = owners.map((owner) => ({
    value: owner.id,
    label: `${owner.name} (${owner.type})`,
  }));
  const fields: Field[] = [
    { name: "title", label: "Asset title", value: selected?.title },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      value: selected?.description,
    },
    { name: "category", label: "Category", value: selected?.category },
    {
      name: "ownerId",
      label: "Owner identity",
      options:
        selected && !owners.some((owner) => owner.id === selected.ownerId)
          ? [
              ...ownerOptions,
              {
                value: selected.ownerId,
                label: `Missing identity: ${selected.ownerId}`,
              },
            ]
          : ownerOptions,
      value: selected?.ownerId,
    },
    { name: "market", label: "Market", value: selected?.market },
  ];
  function action(fn: () => void) {
    try {
      fn();
      setNotice("GS-IP registry updated.");
    } catch (error) {
      setNotice(
        `Error: ${error instanceof Error ? error.message : "Operation failed."}`,
      );
    }
  }
  return (
    <section
      className="portal-dashboard gsip-registry-dashboard"
      aria-label="GS-IP Registry Dashboard"
    >
      <div className="portal-workspace-bar">
        <div>
          <h2>GS-IP Asset Registry</h2>
          <p className="note">
            Ownership, lifecycle, licenses, and recorded revenue
          </p>
        </div>
        <button
          className="button small"
          onClick={() =>
            download(registry.exportRegistry(), "gsip-registry.json")
          }
        >
          Export GS-IP registry
        </button>
      </div>
      {snapshot.error && (
        <div className="notice-banner" role="alert">
          <span>{snapshot.error}</span>
          {snapshot.recovery !== null && (
            <button
              className="button"
              onClick={() =>
                download(snapshot.recovery!, "gsip-original.txt", "text/plain")
              }
            >
              Download original GS-IP records
            </button>
          )}
          <button
            className="button"
            onClick={() => action(registry.replaceSaved)}
          >
            Replace saved GS-IP records
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
          title="Assets Created"
          value={String(metrics.assetsCreated)}
          detail="Registered GS-IP assets"
        />
        <Stat
          title="Active Licenses"
          value={String(metrics.activeLicenses)}
          detail="Issued grants; no expiry tracked"
        />
        <Stat
          title="Revenue Generated"
          value={`$${metrics.revenueGenerated.toFixed(2)}`}
          detail="Recorded USD receipts"
        />
        <Stat
          title="Lifecycle Stages"
          value={String(ASSET_STATUSES.length)}
          detail="Creation through Expansion"
        />
      </div>
      <Panel title="Assets By Stage" eyebrow="LIFECYCLE">
        <ol className="portal-pipeline">
          {metrics.assetsByStage.map((stage) => (
            <li key={stage.status}>
              <span>{stage.status}</span>
              <b>{stage.count}</b>
            </li>
          ))}
        </ol>
      </Panel>
      <Panel title="Create asset" eyebrow="OWNERSHIP FOUNDATION">
        {owners.length ? (
          <RecordForm
            key={`create-${snapshot.error}`}
            submit="Create asset"
            fields={fields.map((field) => ({ ...field, value: undefined }))}
            onSubmit={(values) => {
              const asset = registry.createAsset({
                title: values.title,
                description: values.description,
                category: values.category,
                ownerId: values.ownerId,
                market: values.market,
              });
              setSelectedId(asset.id);
            }}
          />
        ) : (
          <Empty>
            Register an owner in the{" "}
            <a href="#/portal/identity">Identity Dashboard</a> before creating
            an asset.
          </Empty>
        )}
      </Panel>
      <label className="field gsip-stage-filter">
        <span>Filter assets by stage</span>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">All stages</option>
          {ASSET_STATUSES.map((stage) => (
            <option key={stage} value={stage}>
              {stage}
            </option>
          ))}
        </select>
      </label>
      <AssetTable
        assets={snapshot.assets.filter(
          (asset) => !status || asset.status === status,
        )}
        owners={owners}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onAdvance={(asset) =>
          action(() => {
            registry.updateAsset(asset.id, {
              status:
                ASSET_STATUSES[
                  ASSET_STATUSES.indexOf(asset.status as AssetStatus) + 1
                ],
            });
          })
        }
      />
      {selected && (
        <Panel title="Asset details" eyebrow={selected.status}>
          <p className="note identity-id">
            {selected.id} · Created {selected.createdAt}
          </p>
          {!owners.some((owner) => owner.id === selected.ownerId) && (
            <p className="portal-error">
              The recorded owner is missing from the Identity Registry. Assign a
              registered owner to repair the reference; historical ownership
              remains recorded.
            </p>
          )}
          <RecordForm
            key={`${selected.id}-${selected.ownerId}`}
            submit="Save asset"
            fields={fields}
            onSubmit={(values) => {
              registry.updateAsset(selected.id, {
                title: values.title,
                description: values.description,
                category: values.category,
                ownerId: values.ownerId,
                market: values.market,
              });
            }}
          />
          <Rows headers={["From owner ID", "To owner ID", "Recorded at"]}>
            {snapshot.ownership
              .filter((record) => record.assetId === selected.id)
              .map((record) => (
                <tr key={record.id}>
                  <td>{record.fromOwnerId ?? "Original registration"}</td>
                  <td>{record.toOwnerId}</td>
                  <td>{record.timestamp}</td>
                </tr>
              ))}
          </Rows>
        </Panel>
      )}
      <LicenseManager
        key={`license-${snapshot.error}`}
        asset={selected}
        licenses={snapshot.licenses}
        registry={registry}
      />
      <RevenueTracker
        key={`revenue-${selected?.id ?? "none"}-${snapshot.error}`}
        asset={selected}
        revenue={snapshot.revenue}
        registry={registry}
      />
    </section>
  );
}
