// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import IdentityDashboard from "../components/identity/IdentityDashboard";
import PortalDashboard from "../portal/PortalDashboard";
import {
  createIdentityRegistry,
  IDENTITY_STORAGE_KEY,
  identityRegistry,
  type IdentityRegistry,
} from "../identity/registry";
import { routeFor, resolveRoute } from "../portal/routing";
import { executePortalCommand } from "../portal/commands";
import { download } from "../engine/io";
vi.mock("../engine/io", () => ({ download: vi.fn() }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let host: HTMLDivElement, root: Root, registry: IdentityRegistry;
const capability = {
  id: "research",
  name: "Research",
  category: "ICV",
  proficiency: 75,
};
beforeEach(() => {
  localStorage.clear();
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  registry = createIdentityRegistry({ storage: localStorage });
  vi.clearAllMocks();
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});
async function show(value = registry) {
  await act(async () => root.render(<IdentityDashboard registry={value} />));
}
function button(text: string) {
  const found = [...host.querySelectorAll("button")].find(
    (element) => element.textContent === text,
  );
  if (!found) throw new Error(`Missing button: ${text}`);
  return found;
}
async function click(text: string) {
  await act(async () => button(text).click());
}
async function submit(text: string, values: Record<string, string>) {
  const form = button(text).closest("form")!;
  for (const [name, value] of Object.entries(values)) {
    const field = form.elements.namedItem(name) as
      HTMLInputElement | HTMLSelectElement;
    field.value = value;
  }
  await act(async () => {
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  });
}
async function toggle(label: string) {
  const input = [...host.querySelectorAll("label")]
    .find((element) => element.textContent === label)!
    .querySelector("input")!;
  await act(async () => input.click());
}
async function search(value: string) {
  const input = host.querySelector<HTMLInputElement>("input[type=search]")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("Identity Dashboard workflows", () => {
  it("registers, edits, searches, assigns all roles and capabilities, and removes identities", async () => {
    await show();
    expect(host.textContent).toContain("No matching identities");
    expect(host.textContent).toContain("No agent identities");
    await submit("Register identity", { name: "Alice", type: "human" });
    const id = registry.listIdentities()[0].id;
    expect(host.textContent).toContain("No dimensions");
    await submit("Save identity", {
      name: "Alice Jones",
      type: "organization",
    });
    expect(registry.findIdentity(id)).toMatchObject({
      name: "Alice Jones",
      type: "organization",
    });
    await toggle("Founder");
    await toggle("Admin");
    await toggle("Founder");
    expect(registry.findIdentity(id)!.roles).toEqual(["Admin"]);
    await submit("Create capability", {
      id: "research",
      name: "Research",
      category: "ICV",
      proficiency: "75",
    });
    await toggle("Assign Research");
    expect(registry.findIdentity(id)!.capabilities).toEqual(["research"]);
    expect(host.textContent).toContain("research=0.75");
    await toggle("Assign Research");
    expect(registry.findIdentity(id)!.capabilities).toEqual([]);
    await submit("Register identity", { name: "Market bot", type: "agent" });
    expect(host.textContent).toContain("Unassigned");
    await click("Market bot");
    await toggle("MarketAgent");
    await toggle("Assign Research");
    await click("Manage Alice Jones");
    expect(button("Manage Alice Jones").getAttribute("aria-pressed")).toBe(
      "true",
    );
    await search("MARKET");
    expect(host.textContent).not.toContain("Manage Alice Jones");
    expect(host.textContent).toContain("Manage Market bot");
    await search("no-match");
    expect(host.textContent).toContain("No matching identities");
    await search("");
    await click("Export identity registry");
    expect(download).toHaveBeenCalledWith(
      registry.exportRegistry(),
      "portal-identities.json",
    );
    await click("Remove Alice Jones");
    expect(registry.findIdentity(id)).toBeUndefined();
    expect(host.textContent).toContain("Select Manage");
    expect(
      host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.disabled,
    ).toBe(true);
    await click("Remove Market bot");
    expect(registry.listIdentities()).toEqual([]);
    const restored = createIdentityRegistry({ storage: localStorage });
    expect(restored.listIdentities()).toEqual([]);
    expect(restored.getSnapshot().capabilities).toEqual([capability]);
  });

  it("edits capability definitions, guards ID changes and duplicate creation, and cascades deletion", async () => {
    registry.saveCapability(capability);
    registry.registerIdentity({
      id: "agent",
      name: "Research bot",
      type: "agent",
      capabilities: ["research"],
    });
    await show();
    await submit("Create capability", { ...capability, proficiency: "75" });
    expect(host.textContent).toContain("already exists");
    await click("Edit Research");
    await submit("Save capability", { id: "changed" });
    expect(host.textContent).toContain("cannot be changed");
    await click("Cancel capability edit");
    await click("Edit Research");
    await submit("Save capability", { proficiency: "101" });
    expect(host.textContent).toContain("0 to 100");
    await submit("Save capability", {
      proficiency: "90",
      category: "Strategy",
      name: "Analysis",
    });
    expect(registry.getSnapshot().capabilities[0]).toMatchObject({
      proficiency: 90,
      category: "Strategy",
      name: "Analysis",
    });
    await click("Manage Research bot");
    expect(host.textContent).toContain("research=0.9");
    await click("Delete Analysis");
    expect(registry.findIdentity("agent")!.capabilities).toEqual([]);
    expect(host.textContent).toContain("No capabilities yet");
  });

  it("shows failed mutation errors without changing state and allows a retry", async () => {
    registry.registerIdentity({ id: "person", name: "Alice", type: "human" });
    await show();
    await click("Manage Alice");
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("Quota");
      });
    await toggle("Founder");
    expect(host.querySelector("[role=alert]")!.textContent).toContain(
      "Unable to save",
    );
    expect(registry.findIdentity("person")!.roles).toEqual([]);
    spy.mockRestore();
    await toggle("Founder");
    expect(registry.findIdentity("person")!.roles).toEqual(["Founder"]);
    const fail = vi.spyOn(registry, "removeIdentity").mockImplementation(() => {
      throw "Unexpected failure";
    });
    await click("Remove Alice");
    expect(host.textContent).toContain("Operation failed");
    fail.mockRestore();
    await click("Remove Alice");
    expect(host.textContent).toContain("Registry updated");
  });

  it("exports the corrupt original and recovers only after explicit replacement", async () => {
    localStorage.setItem(IDENTITY_STORAGE_KEY, "{broken");
    registry = createIdentityRegistry({ storage: localStorage });
    await show();
    expect(host.textContent).toContain("Writes are paused");
    await submit("Register identity", { name: "Blocked", type: "human" });
    expect(registry.listIdentities()).toEqual([]);
    expect(localStorage.getItem(IDENTITY_STORAGE_KEY)).toBe("{broken");
    await click("Download original identities");
    expect(download).toHaveBeenCalledWith(
      "{broken",
      "portal-identities-original.txt",
      "text/plain",
    );
    await click("Replace saved identities");
    expect(host.textContent).not.toContain("Writes are paused");
    await submit("Register identity", { name: "Recovered", type: "human" });
    expect(registry.listIdentities()[0].name).toBe("Recovered");
  });

  it("renders unavailable storage recovery without an original download", async () => {
    registry = createIdentityRegistry({
      storage: {
        getItem: () => {
          throw new Error("Denied");
        },
        setItem: () => {},
      },
    });
    await show();
    expect(host.textContent).toContain("Replace saved identities");
    expect(host.textContent).not.toContain("Download original identities");
    await click("Replace saved identities");
    expect(registry.getSnapshot().error).toBe("");
  });

  it("integrates navigation, command routing, the Portal shell and browser singleton persistence", async () => {
    expect(resolveRoute(routeFor("identity"))).toBe("identity");
    const navigate = vi.fn();
    executePortalCommand("Open Identity Dashboard", navigate, null, vi.fn());
    expect(navigate).toHaveBeenCalledWith("identity");
    await act(async () =>
      root.render(
        <PortalDashboard
          page="identity"
          navigate={navigate}
          openWorkbench={vi.fn()}
          selected={null}
          onFailure={vi.fn()}
        />,
      ),
    );
    expect(
      host.querySelector('[aria-label="Identity Dashboard"]'),
    ).not.toBeNull();
    await submit("Register identity", {
      name: "Browser singleton",
      type: "human",
    });
    expect(
      JSON.parse(localStorage.getItem(IDENTITY_STORAGE_KEY)!).identities[0]
        .name,
    ).toBe("Browser singleton");
    await act(async () => {
      identityRegistry.removeIdentity(identityRegistry.listIdentities()[0].id);
    });
  });
});
