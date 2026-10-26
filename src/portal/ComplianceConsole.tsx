import { useState } from "react";
import { Panel } from "../components/UI";
import { createId } from "../engine/id";
import { RecordForm, sourceInputs, type Field } from "./forms";
import { sourceFields, type PortalWorkspace } from "./workspace";
import { numeric, txt, Rows, Empty } from "./DashboardUI";
import { auditCompliance } from "../compliance/audit";
export function Compliance({
  data,
  update,
}: {
  data: PortalWorkspace;
  update: (change: (w: PortalWorkspace) => PortalWorkspace) => void;
}) {
  const [editing, setEditing] = useState("");
  const existing = data.compliance.find((c) => c.id === editing);
  const fields: Field[] = [
    {
      name: "assetId",
      label: "Asset",
      options: data.assets.map((a) => ({ value: a.id, label: a.title })),
    },
    txt("owner", "IP owner", true),
    txt("copyright", "Copyright provenance", true),
    txt("trademark", "Trademark clearance or rationale", true),
    txt("license", "License terms / identifier", true),
    {
      name: "personalData",
      label: "Processes personal data",
      type: "checkbox",
    },
    txt("lawfulBasis", "Lawful basis", true),
    { ...numeric("retentionDays", "Retention days", 36500, 1), optional: true },
    txt("reviewer", "Reviewer", true),
    { name: "approved", label: "Reviewer approved", type: "checkbox" },
    { ...numeric("likelihood", "Risk likelihood (1–5)", 5, 1), optional: true },
    { ...numeric("impact", "Risk impact (1–5)", 5, 1), optional: true },
    ...sourceInputs,
  ];
  const defaults = existing
    ? Object.fromEntries(
        Object.entries(existing).map(([key, value]) => [
          key,
          typeof value === "boolean"
            ? value
              ? "on"
              : ""
            : value === null
              ? ""
              : String(value),
        ]),
      )
    : {};
  if (existing) {
    const observed = new Date(existing.observedAt);
    defaults.observedAt = new Date(
      observed.getTime() - observed.getTimezoneOffset() * 60_000,
    )
      .toISOString()
      .slice(0, 16);
  }
  return (
    <>
      <Panel
        title={
          existing ? "Update compliance record" : "Record compliance evidence"
        }
      >
        {!data.assets.length ? (
          <Empty>Create an asset in GS-IP Factory before auditing.</Empty>
        ) : (
          <RecordForm
            key={editing}
            fields={fields.map((f) => ({ ...f, value: defaults[f.name] }))}
            submit={existing ? "Update audit record" : "Record and audit"}
            onSubmit={(v) =>
              update((w) => {
                const record = {
                  id: existing?.id ?? createId(),
                  assetId: v.assetId,
                  owner: v.owner,
                  copyright: v.copyright,
                  trademark: v.trademark,
                  license: v.license,
                  personalData: v.personalData === "on",
                  lawfulBasis: v.lawfulBasis,
                  retentionDays: v.retentionDays
                    ? Number(v.retentionDays)
                    : null,
                  reviewer: v.reviewer,
                  approved: v.approved === "on",
                  likelihood: v.likelihood ? Number(v.likelihood) : null,
                  impact: v.impact ? Number(v.impact) : null,
                  ...sourceFields(v.source, v.observedAt),
                };
                return {
                  ...w,
                  compliance: existing
                    ? w.compliance.map((c) =>
                        c.id === existing.id ? record : c,
                      )
                    : [...w.compliance, record],
                };
              })
            }
          />
        )}
        {existing && (
          <button className="button" onClick={() => setEditing("")}>
            New record
          </button>
        )}
        <p className="note">
          Rules check recorded evidence: ownership and provenance; privacy basis
          and retention; named approval; license presence; risk likelihood ×
          impact (review at ≥12/25). Results support human review and do not
          establish legal compliance.
        </p>
      </Panel>
      <Panel title="Audit decisions">
        {!data.compliance.length && (
          <Empty>No compliance evidence recorded.</Empty>
        )}
        {data.compliance.map((record) => (
          <article className="portal-record" key={record.id}>
            <h3>{data.assets.find((a) => a.id === record.assetId)?.title}</h3>
            <p>
              {record.source} · {record.observedAt} · Record {record.id}
            </p>
            <button className="button" onClick={() => setEditing(record.id)}>
              Edit evidence
            </button>
            <Rows headers={["Rule / version", "Decision", "Reasoning"]}>
              {auditCompliance(record).map((d) => (
                <tr key={d.rule}>
                  <th scope="row">
                    {d.rule} / v{d.version}
                  </th>
                  <td>{d.status}</td>
                  <td>{d.reasons.join(" ")}</td>
                </tr>
              ))}
            </Rows>
          </article>
        ))}
        {data.auditHistory.length > 0 && (
          <details className="portal-settings">
            <summary>
              Audit history ({data.auditHistory.length} revisions)
            </summary>
            <p className="note">
              Latest 20 evidence revisions. Full history is included in
              workspace exports. Rule version 1 is recomputed from each retained
              snapshot.
            </p>
            {data.auditHistory
              .slice(-20)
              .reverse()
              .map((entry) => (
                <article
                  className="portal-record"
                  key={`${entry.record.id}:${entry.revision}`}
                >
                  <p>
                    Record {entry.record.id} · revision {entry.revision} · rules
                    v{entry.rulesVersion} · evaluated {entry.evaluatedAt}
                  </p>
                  <p>
                    Source: {entry.record.source} · observed{" "}
                    {entry.record.observedAt}
                  </p>
                  {auditCompliance(entry.record).map((d) => (
                    <p key={d.rule}>
                      {d.rule}: {d.status} — {d.reasons.join(" ")}
                    </p>
                  ))}
                </article>
              ))}
          </details>
        )}
      </Panel>
    </>
  );
}
