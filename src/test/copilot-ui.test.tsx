// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PortalCopilot from "../copilot/PortalCopilot";
import { CopilotMessage } from "../copilot/CopilotMessage";
import { useCopilot } from "../copilot/CopilotContext";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let host: HTMLDivElement, root: Root;
const navigate = vi.fn(),
  onFailure = vi.fn();
beforeEach(() => {
  useCopilot.setState({ conversations: [], activeId: null });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => {
    fn(0);
    return 1;
  });
  vi.clearAllMocks();
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
async function render() {
  await act(async () =>
    root.render(<PortalCopilot navigate={navigate} onFailure={onFailure} />),
  );
}
function button(text: string) {
  const found = [...host.querySelectorAll("button")].find(
    (b) =>
      b.textContent?.includes(text) || b.getAttribute("aria-label") === text,
  );
  if (!found) throw Error(`Missing button ${text}`);
  return found;
}
async function click(text: string) {
  await act(async () => button(text).click());
}
async function fill(
  field: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) {
  const prototype =
    field instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(
      field,
      value,
    );
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
it("sends suggestions, reports errors, searches/selects/deletes history and opens dashboards", async () => {
  await render();
  expect(host.querySelector("h1")?.textContent).toContain("A little clarity");
  await click("See the bigger picture");
  expect(host.querySelectorAll("article")).toHaveLength(2);
  await click("Open Founder Console");
  expect(navigate).toHaveBeenCalledWith("founder");
  await click("New conversation");
  const input = host.querySelector("textarea")!;
  await fill(input, "Delete everything");
  await click("Send message");
  expect(host.querySelector("[role=alert]")?.textContent).toContain(
    "Supported commands",
  );
  await fill(host.querySelector("input")!, "not found");
  expect(host.textContent).toContain("No conversations found");
  await fill(host.querySelector("input")!, "Summarize");
  await click("Summarize my workspace");
  expect(host.querySelectorAll("article")).toHaveLength(2);
  await click("Delete conversation: Summarize my workspace");
  expect(host.querySelector("h1")?.textContent).toContain("A little clarity");
  await click("What can I ask?");
  expect(host.textContent).toContain(
    "Open-ended model conversation is not connected",
  );
});
it("handles composer keyboard and mobile navigation", async () => {
  await render();
  expect(button("Send message").disabled).toBe(true);
  const textarea = host.querySelector("textarea")!;
  await act(async () =>
    textarea
      .closest("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  expect(useCopilot.getState().conversations).toHaveLength(0);
  await fill(textarea, "Help");
  for (const options of [{ shiftKey: true }, { isComposing: true }])
    await act(async () =>
      textarea.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
          ...options,
        }),
      ),
    );
  expect(useCopilot.getState().conversations).toHaveLength(0);
  await act(async () =>
    textarea.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
  expect(useCopilot.getState().conversations).toHaveLength(1);
  await click("Open navigation");
  expect(host.querySelector("aside")?.className).toContain("is-open");
  await act(async () =>
    host
      .querySelector("aside")!
      .dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
  );
  expect(host.querySelector("aside")?.className).not.toContain("is-open");
  await click("Open navigation");
  await click("Dismiss navigation");
  await click("Open navigation");
  await click("Close navigation");
  await click("Workspace connected");
  expect(navigate).toHaveBeenCalledWith("founder");
  await click("Architecture workbench");
  expect(navigate).toHaveBeenCalledWith("Topology");
  await click("Help & shortcuts");
  expect(host.textContent).toContain("History stays in this browser tab");
});
it("copies responses and handles clipboard rejection", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  await act(async () =>
    root.render(
      <CopilotMessage
        message={{
          id: "copy",
          role: "assistant",
          text: "Measured result",
          source: "fixture",
        }}
        navigate={navigate}
      />,
    ),
  );
  await click("Copy response");
  expect(writeText).toHaveBeenCalledWith("Measured result");
  expect(host.textContent).toContain("Copied");
  writeText.mockRejectedValue(new Error("Denied"));
  await click("Copy response");
  expect(host.textContent).toContain("Copy unavailable");
});

it("keeps the route when skipping to content and cycles focus inside the mobile drawer", async () => {
  await render();
  const route = window.location.href;
  await act(async () =>
    host.querySelector<HTMLAnchorElement>(".skip-link")!.click(),
  );
  expect(window.location.href).toBe(route);
  expect(document.activeElement?.id).toBe("main");
  await click("Open navigation");
  const aside = host.querySelector("aside")!;
  const first = button("Close navigation");
  const last = [...aside.querySelectorAll<HTMLButtonElement>("button")].at(-1)!;
  const rect = {
    x: 0,
    y: 0,
    width: 30,
    height: 30,
    top: 0,
    left: 0,
    right: 30,
    bottom: 30,
    toJSON() {
      return {};
    },
  };
  const mock = vi
    .spyOn(Element.prototype, "getClientRects")
    .mockReturnValue([rect] as unknown as DOMRectList);
  first.focus();
  await act(async () =>
    first.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
  expect(document.activeElement).toBe(last);
  await act(async () =>
    last.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
  expect(document.activeElement).toBe(first);
  await click("Close navigation");
  expect(document.activeElement?.id).toBe("copilot-menu");
  mock.mockRestore();
  await click("Portal Copilot");
  expect(document.activeElement?.id).toBe("copilot-prompt");
});
