import { useEffect, useMemo, useRef, useState } from "react";
import {
  createWorkerBridge,
  workerPayload,
  WORKER_ENDPOINTS,
  type WorkerEndpoint,
} from "../../integration/workerBridge";
import type { PortalSystemState } from "../../integration/types";
import { Panel } from "../UI";
export default function WorkerPanel({
  state,
  baseUrl = import.meta.env.VITE_PORTAL_WORKER_BASE_URL ?? "",
  fetcher,
}: {
  state: PortalSystemState;
  baseUrl?: string;
  fetcher?: typeof fetch;
}) {
  const [endpoint, setEndpoint] = useState<WorkerEndpoint>("icv");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState("");
  const pending = useRef<AbortController | null>(null);
  const configuration = useMemo(() => {
    if (!baseUrl)
      return {
        bridge: null,
        error:
          "Set VITE_PORTAL_WORKER_BASE_URL to connect your Worker deployment.",
      };
    try {
      return { bridge: createWorkerBridge({ baseUrl, fetcher }), error: "" };
    } catch {
      return {
        bridge: null,
        error:
          "Worker configuration is invalid. Use an HTTP(S) base URL without credentials, query or fragment.",
      };
    }
  }, [baseUrl, fetcher]);
  useEffect(() => {
    setBusy(false);
    setMessage("");
    setResult("");
    return () => {
      pending.current?.abort();
      pending.current = null;
    };
  }, [configuration]);
  return (
    <Panel
      title="Worker API adapters"
      eyebrow={
        configuration.bridge ? "CONFIGURED · ON DEMAND" : "NOT CONFIGURED"
      }
    >
      <p className="note">
        {configuration.error ||
          "Send the selected domain snapshot to the configured Worker. Responses remain remote results until explicitly reviewed; they do not overwrite local records."}
      </p>
      <form
        className="portal-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!configuration.bridge) return;
          pending.current?.abort();
          const controller = new AbortController();
          pending.current = controller;
          setBusy(true);
          setMessage("");
          setResult("");
          try {
            const response = await configuration.bridge.request(
              endpoint,
              workerPayload(endpoint, state, prompt),
              controller.signal,
            );
            if (pending.current === controller)
              setResult(
                `${endpoint}: ${JSON.stringify(response.data, null, 2)}`,
              );
          } catch (error) {
            if (pending.current === controller)
              setMessage(
                error instanceof Error
                  ? error.message
                  : "Worker request failed.",
              );
          } finally {
            if (pending.current === controller) {
              setBusy(false);
              pending.current = null;
            }
          }
        }}
      >
        <label className="field">
          <span>Worker domain</span>
          <select
            value={endpoint}
            onChange={(event) =>
              setEndpoint(event.target.value as WorkerEndpoint)
            }
          >
            {Object.keys(WORKER_ENDPOINTS).map((key) => (
              <option key={key}>{key}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>ICV prompt (optional)</span>
          <textarea
            maxLength={20000}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
        </label>
        <button
          className="button"
          disabled={!configuration.bridge || busy}
          type="submit"
        >
          {busy ? "Calling Worker…" : "Call Worker adapter"}
        </button>
      </form>
      {message && <p role="alert">{message}</p>}
      <pre className="system-worker-result" role="status">
        {result}
      </pre>
    </Panel>
  );
}
