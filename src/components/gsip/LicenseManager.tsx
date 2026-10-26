import type { AssetRegistry } from "../../gsip/registry/assetRegistry";
import type { GSIPAsset, License } from "../../gsip/registry/types";
import { RecordForm } from "../../portal/forms";
import { Empty, Rows } from "../../portal/DashboardUI";
import { Panel } from "../UI";
export default function LicenseManager({
  asset,
  licenses,
  registry,
}: {
  asset: GSIPAsset | undefined;
  licenses: readonly License[];
  registry: AssetRegistry;
}) {
  const records = licenses.filter((license) => license.assetId === asset?.id);
  return (
    <Panel title="License manager" eyebrow="RECORDED GRANTS">
      <p className="note">
        Active licenses counts all issued grants. Expiration, revocation, and
        automated enforcement are not tracked by this schema.
      </p>
      {asset ? (
        <>
          <p>Issue a license for {asset.title}.</p>
          <RecordForm
            key={asset.id}
            submit="Issue license"
            fields={[
              { name: "holder", label: "License holder" },
              { name: "type", label: "License type" },
            ]}
            onSubmit={(values) => {
              registry.createLicense({
                assetId: asset.id,
                holder: values.holder,
                type: values.type,
              });
            }}
          />
          {records.length ? (
            <Rows headers={["Holder", "Type", "Issued at", "License ID"]}>
              {records.map((license) => (
                <tr key={license.id}>
                  <th scope="row">{license.holder}</th>
                  <td>{license.type}</td>
                  <td>{license.issuedAt}</td>
                  <td>{license.id}</td>
                </tr>
              ))}
            </Rows>
          ) : (
            <Empty>No licenses for this asset.</Empty>
          )}
        </>
      ) : (
        <Empty>
          Select Manage in the asset directory to issue and view licenses.
        </Empty>
      )}
    </Panel>
  );
}
