import { useState } from "react";
import type { AssetRegistry } from "../../gsip/registry/assetRegistry";
import type { GSIPAsset, RevenueRecord } from "../../gsip/registry/types";
import { totalRevenue } from "../../gsip/registry/revenue";
import { calculateRoyalty } from "../../gsip/registry/royalties";
import { Empty, Rows } from "../../portal/DashboardUI";
import { RecordForm } from "../../portal/forms";
import { Panel } from "../UI";
export default function RevenueTracker({
  asset,
  revenue,
  registry,
}: {
  asset: GSIPAsset | undefined;
  revenue: readonly RevenueRecord[];
  registry: AssetRegistry;
}) {
  const [percentage, setPercentage] = useState(0);
  const records = revenue.filter((record) => record.assetId === asset?.id);
  const total = totalRevenue(records);
  return (
    <Panel title="Revenue tracker" eyebrow="USD RECEIPTS">
      {asset ? (
        <>
          <p>
            Recorded revenue for {asset.title}: <b>${total.toFixed(2)} USD</b>
          </p>
          {["Revenue", "Expansion"].includes(asset.status) ? (
            <RecordForm
              key={asset.id}
              submit="Record receipt"
              fields={[
                {
                  name: "amount",
                  label: "Receipt amount (USD)",
                  type: "number",
                  min: 0.01,
                  max: 1_000_000_000,
                  step: "0.01",
                },
                { name: "source", label: "Revenue source" },
              ]}
              onSubmit={(values) => {
                registry.recordRevenue({
                  assetId: asset.id,
                  amount: Number(values.amount),
                  source: values.source,
                });
              }}
            />
          ) : (
            <p className="note">
              Advance this asset to Revenue before recording receipts.
            </p>
          )}
          {records.length ? (
            <Rows
              headers={["Amount (USD)", "Source", "Recorded at", "Receipt ID"]}
            >
              {records.map((record) => (
                <tr key={record.id}>
                  <th scope="row">${record.amount.toFixed(2)}</th>
                  <td>{record.source}</td>
                  <td>{record.timestamp}</td>
                  <td>{record.id}</td>
                </tr>
              ))}
            </Rows>
          ) : (
            <Empty>No revenue receipts for this asset.</Empty>
          )}
          <RecordForm
            key={`royalty-${asset.id}`}
            submit="Preview royalty"
            fields={[
              {
                name: "percentage",
                label: "Royalty percentage (0–100)",
                type: "number",
                min: 0,
                max: 100,
                value: "0",
              },
            ]}
            onSubmit={(values) => {
              const rate = Number(values.percentage);
              calculateRoyalty(total, rate);
              setPercentage(rate);
            }}
          />
          <p className="note">
            Royalty preview at {percentage}%: $
            {calculateRoyalty(total, percentage).toFixed(2)} USD. Planning only;
            no obligation or payout is recorded.
          </p>
        </>
      ) : (
        <Empty>
          Select Manage in the asset directory to view and record revenue.
        </Empty>
      )}
    </Panel>
  );
}
