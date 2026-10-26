import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createWorkerBridge,
  workerPayload,
  WORKER_ENDPOINTS,
  type WorkerEndpoint,
} from "../integration/workerBridge";
import { integrationSetup } from "./integration-fixtures";
afterEach(() => vi.useRealTimers());
describe("Worker adapter contracts", () => {
  it("routes all domains through a configurable base and a versioned request/response envelope", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ version: 1, data: { accepted: true } })),
      );
    const bridge = createWorkerBridge({
      baseUrl: "https://worker.example/alpha",
      fetcher,
    });
    const f = integrationSetup(),
      state = f.system.getSnapshot();
    for (const endpoint of Object.keys(WORKER_ENDPOINTS) as WorkerEndpoint[]) {
      fetcher.mockResolvedValueOnce(
        new Response(JSON.stringify({ version: 1, data: { accepted: true } })),
      );
      expect(
        await bridge.request(
          endpoint,
          workerPayload(endpoint, state, "Review"),
        ),
      ).toEqual({ version: 1, data: { accepted: true } });
      const [url, options] = fetcher.mock.calls.at(-1)!;
      expect(url).toBe("https://worker.example/alpha/api/" + endpoint);
      expect(options).toMatchObject({
        method: "POST",
        credentials: "omit",
        redirect: "error",
      });
      expect(JSON.parse(options!.body as string)).toEqual({
        version: 1,
        payload: workerPayload(endpoint, state, "Review"),
      });
    }
    expect(
      workerPayload(
        "store",
        {
          ...state,
          assets: state.assets.map((a) => ({ ...a, status: "Product" })),
        },
        "",
      ),
    ).toEqual({
      assets: state.assets.map((a) => ({ ...a, status: "Product" })),
    });
    expect(workerPayload("store", state, "")).toEqual({ assets: [] });
    expect(workerPayload("icv", state, "Review")).toHaveProperty(
      "prompt",
      "Review",
    );
    expect(f.system.getSnapshot()).toBe(state);
    const custom = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('{"version":1,"data":null}'));
    await createWorkerBridge({
      baseUrl: "http://localhost:8787/",
      endpoints: { icv: "v2/icv" },
      fetcher: custom,
    }).request("icv", {});
    expect(custom.mock.calls[0][0]).toBe("http://localhost:8787/v2/icv");
  });
  it("rejects unsafe configuration, unknown routes, oversized bodies and invalid remote results", async () => {
    for (const baseUrl of [
      "relative",
      "ftp://example.com",
      "https://a:b@example.com",
      "https://example.com?q=x",
      "https://example.com/#x",
    ])
      expect(() => createWorkerBridge({ baseUrl })).toThrow();
    for (const timeoutMs of [0, NaN, 60001])
      expect(() =>
        createWorkerBridge({ baseUrl: "https://example.com", timeoutMs }),
      ).toThrow("timeout");
    for (const path of ["/api/icv", "../icv", "https://evil.example/x", ""])
      expect(() =>
        createWorkerBridge({
          baseUrl: "https://example.com",
          endpoints: { icv: path },
        }),
      ).toThrow("relative");
    const fetcher = vi.fn<typeof fetch>(),
      bridge = createWorkerBridge({ baseUrl: "https://example.com", fetcher });
    await expect(bridge.request("toString" as never, {})).rejects.toThrow(
      "Unknown",
    );
    await expect(bridge.request("icv", "x".repeat(2_000_001))).rejects.toThrow(
      "payload",
    );
    for (const raw of [
      "{}",
      '{"version":2,"data":{}}',
      '{"version":1}',
      "not json",
      "[]",
    ]) {
      fetcher.mockResolvedValueOnce(new Response(raw));
      await expect(bridge.request("icv", {})).rejects.toThrow();
    }
    fetcher.mockResolvedValueOnce(new Response("no", { status: 503 }));
    await expect(bridge.request("gsip", {})).rejects.toThrow("HTTP 503");
    fetcher.mockResolvedValueOnce(new Response("x".repeat(2_000_001)));
    await expect(bridge.request("gsip", {})).rejects.toThrow(
      "response exceeds",
    );
    fetcher.mockRejectedValueOnce(Error("offline"));
    await expect(bridge.request("markets", {})).rejects.toThrow("offline");
  });
  it("cancels and times out requests without leaking listeners or changing local stores", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options!.signal!.addEventListener(
            "abort",
            () => reject(Error("aborted")),
            { once: true },
          );
        }),
    );
    const bridge = createWorkerBridge({
      baseUrl: "https://example.com",
      fetcher,
      timeoutMs: 20,
    });
    const controller = new AbortController(),
      remove = vi.spyOn(controller.signal, "removeEventListener");
    const pending = bridge.request("compliance", {}, controller.signal);
    const failure = expect(pending).rejects.toThrow("cancelled");
    controller.abort();
    await failure;
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
    await expect(
      bridge.request("store", {}, controller.signal),
    ).rejects.toThrow("cancelled");
    expect(fetcher).toHaveBeenCalledTimes(1);
    const timed = expect(bridge.request("icv", {})).rejects.toThrow(
      "timed out",
    );
    await vi.advanceTimersByTimeAsync(20);
    await timed;
    expect(vi.getTimerCount()).toBe(0);
  });
});
