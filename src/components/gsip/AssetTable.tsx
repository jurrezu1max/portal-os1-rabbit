import type { GSIPAsset } from "../../gsip/registry/types";
import { ASSET_STATUSES } from "../../gsip/registry/types";
import type { Identity } from "../../identity/types";
import { Empty, Rows } from "../../portal/DashboardUI";
import { Panel } from "../UI";
export default function AssetTable({
  assets,
  owners,
  selectedId,
  onSelect,
  onAdvance,
}: {
  assets: readonly GSIPAsset[];
  owners: readonly Identity[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdvance: (asset: GSIPAsset) => void;
}) {
  return (
    <Panel title="Asset directory" eyebrow="GS-IP REGISTRY">
      {assets.length === 0 ? (
        <Empty>No matching assets. Register an asset to begin.</Empty>
      ) : (
        <Rows headers={["Asset", "Owner", "Stage", "Market", "Actions"]}>
          {assets.map((asset) => (
            <tr key={asset.id}>
              <th scope="row">
                {asset.title}
                <small className="identity-id">{asset.id}</small>
              </th>
              <td>
                {owners.find((owner) => owner.id === asset.ownerId)?.name ??
                  `Missing identity: ${asset.ownerId}`}
              </td>
              <td>{asset.status}</td>
              <td>{asset.market}</td>
              <td>
                <div className="button-row">
                  <button
                    className="button small"
                    aria-pressed={selectedId === asset.id}
                    onClick={() => onSelect(asset.id)}
                  >
                    Manage {asset.title}
                  </button>
                  <button
                    className="button small"
                    disabled={
                      asset.status === ASSET_STATUSES[ASSET_STATUSES.length - 1]
                    }
                    onClick={() => onAdvance(asset)}
                  >
                    Advance {asset.title}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Rows>
      )}
    </Panel>
  );
}
