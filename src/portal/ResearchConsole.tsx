import { useState } from "react";
import { Panel, number } from "../components/UI";
import { createId } from "../engine/id";
import { RecordForm, sourceInputs } from "./forms";
import { sourceFields, sessionId, type PortalWorkspace } from "./workspace";
import { numeric, txt, Rows, Empty } from "./DashboardUI";
import type { Page } from "../types";
import { useWorkbench } from "../state/workbench";
import { createContext } from "../icv/context";
import { planAction } from "../icv/strategy";
export function Research({
  data,
  update,
  openWorkbench,
}: {
  data: PortalWorkspace;
  update: (change: (w: PortalWorkspace) => PortalWorkspace) => void;
  openWorkbench: (page: Page) => void;
}) {
  const [plan, setPlan] = useState<ReturnType<typeof planAction> | null>(null);
  const [graphMessage, setGraphMessage] = useState("");
  return (
    <>
      <Panel title="Record evidence">
        <RecordForm
          fields={[
            txt("domain", "Domain (e.g. climate)"),
            txt("metric", "Metric (e.g. emissions)"),
            numeric("value", "Value", undefined, -Number.MAX_SAFE_INTEGER),
            txt("unit", "Unit (e.g. tCO2e/year)"),
            ...sourceInputs,
          ]}
          submit="Record observation"
          onSubmit={(v) =>
            update((w) => ({
              ...w,
              observations: [
                ...w.observations,
                {
                  id: createId(),
                  domain: v.domain,
                  metric: v.metric,
                  value: Number(v.value),
                  unit: v.unit,
                  ...sourceFields(v.source, v.observedAt),
                },
              ],
            }))
          }
        />
      </Panel>
      <Panel
        title="ICV pipeline"
        eyebrow="MEANING → CONTEXT → COHERENCE → STRATEGY → ACTION"
      >
        <RecordForm
          fields={[
            {
              name: "input",
              label: "Research question or proposed action",
              type: "textarea",
            },
          ]}
          submit="Analyze input"
          onSubmit={(v) =>
            setPlan(
              planAction(
                v.input,
                createContext(
                  sessionId,
                  data.name,
                  data.project,
                  data.goals,
                  data.profile,
                ),
                data.observations,
              ),
            )
          }
        />
        {plan && (
          <div className="portal-record">
            <p>
              Entities:{" "}
              {plan.meaning.entities.join(", ") || "No lexicon matches"}
            </p>
            <p>
              Classification:{" "}
              {plan.meaning.classifications.join(", ") || "Unclassified"}
            </p>
            <p>
              Co-mentions:{" "}
              {plan.meaning.relationships
                .map((r) => `${r.source} ↔ ${r.target}`)
                .join("; ") || "None"}
            </p>
            <p>
              Context: {plan.context.workspace} / {plan.context.project} ·{" "}
              {plan.context.profile.role}
            </p>
            <p>
              Goal alignment:{" "}
              {plan.coherence.alignment === null
                ? "N/A (no goals)"
                : `${number(plan.coherence.alignment, 1)}%`}{" "}
              · Integrity:{" "}
              {plan.verification.valid ? "valid metadata" : "review needed"}
            </p>
            {[
              ...plan.coherence.reasoning,
              ...plan.coherence.conflicts,
              ...plan.verification.issues,
              ...plan.actions,
            ].map((line, index) => (
              <p key={index}>{line}</p>
            ))}
            <p className="note">
              This lexicon analysis and metadata validation do not verify
              reality. Review sources independently.
            </p>
          </div>
        )}
      </Panel>
      <Panel title="Evidence ledger">
        {!data.observations.length ? (
          <Empty>No observations recorded.</Empty>
        ) : (
          <Rows
            headers={[
              "Domain / metric",
              "Value",
              "Source / observed at",
              "Graph",
            ]}
          >
            {data.observations.map((o) => (
              <tr key={o.id}>
                <th scope="row">
                  {o.domain} / {o.metric}
                </th>
                <td>
                  {number(o.value, 2)} {o.unit}
                </td>
                <td>
                  {o.source}
                  <br />
                  {o.observedAt}
                </td>
                <td>
                  <button
                    className="button small"
                    onClick={() => {
                      try {
                        useWorkbench.getState().addNode({
                          id: `evidence-${o.id}`,
                          label: `${o.domain}: ${o.metric}`.slice(0, 100),
                          type: "Cognition",
                        });
                        setGraphMessage(
                          "Observation modeled as a Cognition node.",
                        );
                      } catch (e) {
                        setGraphMessage(
                          e instanceof Error
                            ? e.message
                            : "Unable to model observation.",
                        );
                      }
                    }}
                  >
                    Model in graph
                  </button>
                </td>
              </tr>
            ))}
          </Rows>
        )}
        <p role="status">{graphMessage}</p>
        <div className="button-row">
          {(
            [
              "Topology",
              "Spectral analysis",
              "Research mode",
              "Intelligence feed",
            ] as const
          ).map((page) => (
            <button
              className="button"
              key={page}
              onClick={() => openWorkbench(page)}
            >
              {page}
            </button>
          ))}
        </div>
      </Panel>
    </>
  );
}
