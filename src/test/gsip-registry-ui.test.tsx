// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GSIPRegistryDashboard from "../components/gsip/GSIPRegistryDashboard";
import PortalDashboard from "../portal/PortalDashboard";
import {
  createAssetRegistry,
  GSIP_STORAGE_KEY,
  type AssetRegistry,
} from "../gsip/registry/assetRegistry";
import {
  createIdentityRegistry,
  type IdentityRegistry,
} from "../identity/registry";
import { ASSET_STATUSES } from "../gsip/registry/types";
import { download } from "../engine/io";
import { resolveRoute, routeFor } from "../portal/routing";
import { executePortalCommand } from "../portal/commands";
vi.mock("../engine/io", () => ({ download: vi.fn() }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let host: HTMLDivElement,
  root: Root,
  registry: AssetRegistry,
  identities: IdentityRegistry;
const input = {
  title: "Research report",
  description: "Original report",
  category: "Research",
  ownerId: "owner",
  market: "Education",
};
beforeEach(() => {
  localStorage.clear();
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  identities = createIdentityRegistry();
  identities.registerIdentity({ id: "owner", name: "Founder", type: "human" });
  identities.registerIdentity({
    id: "next",
    name: "Publisher",
    type: "organization",
  });
  registry = createAssetRegistry({
    storage: localStorage,
    findIdentity: identities.findIdentity,
  });
  vi.clearAllMocks();
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});
async function show() {
  await act(async () =>
    root.render(
      <GSIPRegistryDashboard registry={registry} identities={identities} />,
    ),
  );
}
function button(text: string) {
  const found = [...host.querySelectorAll("button")].find(
    (button) => button.textContent === text,
  );
  if (!found) throw new Error(`Missing button: ${text}`);
  return found;
}
async function click(text: string) {
  await act(async () => button(text).click());
}
async function submit(label: string, values: Record<string, string>) {
  const form = button(label).closest("form")!;
  for (const [name, value] of Object.entries(values))
    (form.elements.namedItem(name) as HTMLInputElement).value = value;
  await act(async () => {
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  });
}
async function filter(value: string) {
  const select = host.querySelector<HTMLSelectElement>(
    ".gsip-stage-filter select",
  )!;
  await act(async () => {
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

describe("GS-IP Registry Dashboard", () => {
  it("creates and edits owned assets, issues licenses, advances all stages and records receipts and royalty previews", async () => {
    await show();
    expect(host.textContent).toContain("No matching assets");
    expect(host.textContent).toContain("Select Manage");
    await submit("Create asset", input);
    const assetId = registry.listAssets()[0].id;
    expect(host.textContent).toContain("Original registration");
    expect(host.textContent).toContain("Advance this asset to Revenue");
    await submit("Save asset", {
      title: "Published report",
      ownerId: "next",
      market: "Publishing",
    });
    expect(registry.getAsset(assetId)).toMatchObject({
      title: "Published report",
      ownerId: "next",
      market: "Publishing",
    });
    expect(registry.getSnapshot().ownership).toHaveLength(2);
    await submit("Issue license", {
      holder: "Example reader",
      type: "Commercial",
    });
    expect(registry.getMetrics().activeLicenses).toBe(1);
    expect(host.textContent).toContain("Example reader");
    await click("Manage Published report");
    expect(button("Manage Published report").getAttribute("aria-pressed")).toBe(
      "true",
    );
    await filter("Expansion");
    expect(host.textContent).toContain("No matching assets");
    await filter("");
    for (let index = 0; index < 6; index++)
      await click("Advance Published report");
    await click("Advance Published report");
    expect(host.textContent).toContain("positive revenue");
    await submit("Record receipt", { amount: "0.1", source: "Invoice one" });
    await submit("Record receipt", { amount: "0.2", source: "Invoice two" });
    expect(registry.getMetrics().revenueGenerated).toBe(0.3);
    expect(host.textContent).toContain("$0.30");
    await submit("Preview royalty", { percentage: "10" });
    expect(host.textContent).toContain("$0.03 USD");
    await submit("Preview royalty", { percentage: "101" });
    expect(host.textContent).toContain("0–100");
    await click("Advance Published report");
    expect(button("Advance Published report").disabled).toBe(true);
    await submit("Record receipt", {
      amount: "1.01",
      source: "Expansion invoice",
    });
    await click("Export GS-IP registry");
    expect(download).toHaveBeenCalledWith(
      registry.exportRegistry(),
      "gsip-registry.json",
    );
    const restored = createAssetRegistry({ storage: localStorage });
    expect(restored.getAsset(assetId)!.status).toBe("Expansion");
    expect(restored.getRevenue(assetId)).toHaveLength(3);
    expect(restored.getSnapshot().licenses).toHaveLength(1);
    await filter("Expansion");
    expect(host.textContent).toContain("Manage Published report");
  });

  it("requires owners before creation and retains ownership history after identity removal", async () => {
    const asset = registry.createAsset(input);
    await show();
    await click("Manage Research report");
    await act(async () => {
      identities.removeIdentity("owner");
      identities.removeIdentity("next");
    });
    expect(host.textContent).toContain("Register an owner");
    expect(host.querySelector('a[href="#/portal/identity"]')).not.toBeNull();
    expect(host.textContent).toContain("Missing identity: owner");
    expect(host.textContent).toContain("recorded owner is missing");
    await submit("Save asset", { title: "Historical asset" });
    expect(registry.getAsset(asset.id)!.title).toBe("Historical asset");
    await act(async () => {
      identities.registerIdentity({
        id: "replacement",
        name: "New organization",
        type: "organization",
      });
    });
    await submit("Save asset", { ownerId: "replacement" });
    expect(registry.getAsset(asset.id)!.ownerId).toBe("replacement");
    expect(host.textContent).not.toContain("recorded owner is missing");
  });

  it("shows validation and storage failures and retries atomic writes", async () => {
    registry.createAsset(input);
    await show();
    await click("Manage Research report");
    await submit("Save asset", { title: " " });
    expect(host.textContent).toContain("Text requires");
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("Quota");
      });
    await click("Advance Research report");
    expect(host.textContent).toContain("Unable to save");
    expect(registry.listAssets()[0].status).toBe("Creation");
    spy.mockRestore();
    await click("Advance Research report");
    expect(registry.listAssets()[0].status).toBe("Framework");
    const fail = vi.spyOn(registry, "updateAsset").mockImplementation(() => {
      throw "Unexpected failure";
    });
    await click("Advance Research report");
    expect(host.textContent).toContain("Operation failed");
    fail.mockRestore();
  });

  it("protects the corrupt original, downloads it and recovers with fresh forms", async () => {
    localStorage.setItem(GSIP_STORAGE_KEY, "{broken");
    registry = createAssetRegistry({
      storage: localStorage,
      findIdentity: identities.findIdentity,
    });
    await show();
    await submit("Create asset", input);
    expect(host.textContent).toContain("Writes are paused");
    expect(registry.listAssets()).toEqual([]);
    await click("Download original GS-IP records");
    expect(download).toHaveBeenCalledWith(
      "{broken",
      "gsip-original.txt",
      "text/plain",
    );
    expect(localStorage.getItem(GSIP_STORAGE_KEY)).toBe("{broken");
    await click("Replace saved GS-IP records");
    expect(host.textContent).not.toContain("Writes are paused");
    await submit("Create asset", input);
    expect(registry.listAssets()).toHaveLength(1);
  });

  it("offers recovery when storage reads are blocked without inventing an original", async () => {
    registry = createAssetRegistry({
      storage: {
        getItem: () => {
          throw new Error("Denied");
        },
        setItem: () => {},
      },
    });
    await show();
    expect(host.textContent).toContain("Replace saved GS-IP records");
    expect(host.textContent).not.toContain("Download original GS-IP records");
    await click("Replace saved GS-IP records");
    expect(host.textContent).not.toContain("Writes are paused");
  });

  it("isolates selected-asset licenses and revenue and resets royalty previews on selection", async () => {
    const first = registry.createAsset(input),
      second = registry.createAsset({ ...input, title: "Second" });
    for (const status of ASSET_STATUSES.slice(1, -1))
      registry.updateAsset(first.id, { status });
    registry.recordRevenue({
      assetId: first.id,
      amount: 100,
      source: "First receipt",
    });
    registry.createLicense({
      assetId: first.id,
      holder: "First holder",
      type: "Personal",
    });
    await show();
    await click("Manage Research report");
    await submit("Preview royalty", { percentage: "20" });
    expect(host.textContent).toContain("$20.00 USD");
    await click("Manage Second");
    expect(host.textContent).not.toContain("First holder");
    expect(host.textContent).not.toContain("First receipt");
    expect(host.textContent).toContain("Royalty preview at 0%");
    expect(registry.getRevenue(second.id)).toEqual([]);
  });

  it("integrates the new hash route, navigation command and existing Portal shell", async () => {
    expect(resolveRoute(routeFor("gsip-registry"))).toBe("gsip-registry");
    const navigate = vi.fn();
    executePortalCommand(
      "Open GS-IP Registry Dashboard",
      navigate,
      null,
      vi.fn(),
    );
    expect(navigate).toHaveBeenCalledWith("gsip-registry");
    await act(async () =>
      root.render(
        <PortalDashboard
          page="gsip-registry"
          navigate={navigate}
          openWorkbench={vi.fn()}
          selected={null}
          onFailure={vi.fn()}
        />,
      ),
    );
    expect(
      host.querySelector('[aria-label="GS-IP Registry Dashboard"]'),
    ).not.toBeNull();
  });
});
