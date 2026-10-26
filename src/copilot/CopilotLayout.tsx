import { useState, type ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Box,
  ChevronDown,
  CircleHelp,
  Compass,
  LayoutDashboard,
  Menu,
  Network,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { DASHBOARDS, type DashboardId } from "../portal/navigation";
import type { Page } from "../types";
import { CopilotHistory } from "./CopilotHistory";
import { useCopilot } from "./CopilotContext";
const icons = {
  founder: LayoutDashboard,
  opportunities: Compass,
  "gsip-registry": Box,
  agents: Users,
  compliance: ShieldCheck,
  research: BookOpen,
};
export function CopilotLayout({
  children,
  navigate,
  name,
  issues,
}: {
  children: ReactNode;
  navigate: (page: DashboardId | Page) => void;
  name: string;
  issues: number;
}) {
  const [open, setOpen] = useState(false);
  const { newConversation } = useCopilot();
  function start() {
    newConversation();
    setOpen(false);
    requestAnimationFrame(() =>
      document.getElementById("copilot-prompt")?.focus(),
    );
  }
  function close() {
    setOpen(false);
    requestAnimationFrame(() =>
      document.getElementById("copilot-menu")?.focus(),
    );
  }
  return (
    <div className="copilot-shell">
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        Skip to content
      </a>
      <aside
        className={`copilot-sidebar ${open ? "is-open" : ""}`}
        aria-label="Copilot navigation"
        onKeyDown={(event) => {
          if (event.key === "Tab" && open) {
            const controls = [
              ...event.currentTarget.querySelectorAll<HTMLElement>(
                "button, input, summary",
              ),
            ].filter((element) => element.getClientRects().length > 0);
            const first = controls[0],
              last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
          if (event.key === "Escape") {
            close();
          }
        }}
      >
        <div className="copilot-brand">
          <span className="copilot-brand-mark">
            <Activity size={24} />
          </span>
          <b>
            PORTAL<span>–</span>OS
          </b>
          <small>ALPHA</small>
          <button
            className="copilot-close"
            aria-label="Close navigation"
            onClick={close}
          >
            <X size={18} />
          </button>
        </div>
        <div className="copilot-workspace">
          <span className="copilot-workspace-icon">
            <Box size={17} />
          </span>
          <div>
            <b>{name}</b>
            <small>Personal workspace</small>
          </div>
          <ChevronDown size={13} />
        </div>
        <button className="copilot-new" onClick={start}>
          <Plus size={16} /> New conversation
        </button>
        <nav aria-label="Platform navigation">
          <button
            className="copilot-nav-active"
            onClick={start}
            aria-current="page"
          >
            <Sparkles size={17} /> Portal Copilot <span>NEW</span>
          </button>
          <div className="copilot-nav-label">WORKSPACE</div>
          {Object.entries(icons).map(([id, Icon]) => (
            <button key={id} onClick={() => navigate(id as DashboardId)}>
              <Icon size={16} />
              {DASHBOARDS.find((d) => d.id === id)?.title}
            </button>
          ))}
          <details>
            <summary>
              <LayoutDashboard size={16} /> All dashboards{" "}
              <ChevronDown size={13} />
            </summary>
            {DASHBOARDS.filter((d) => !(d.id in icons)).map((d) => (
              <button key={d.id} onClick={() => navigate(d.id)}>
                {d.title}
              </button>
            ))}
            <button onClick={() => navigate("Topology")}>
              <Network size={15} /> Architecture workbench
            </button>
            <button onClick={() => navigate("Portal assistant")}>
              Portal Assistant
            </button>
          </details>
        </nav>
        <CopilotHistory
          onSelect={() => {
            setOpen(false);
            requestAnimationFrame(() =>
              document.getElementById("copilot-prompt")?.focus(),
            );
          }}
        />
        <div className="copilot-sidebar-bottom">
          <button
            onClick={() => {
              useCopilot.getState().exchange("Help", {
                text: "Ask for a workspace summary, market opportunities, or compliance review. Use “Run agents” for local recommendations. Open dashboards by full name. Architecture commands include “Compute Identity Invariant”, “Create Memory Cluster”, and “Save snapshot v1”. Shift+Enter adds a line. History stays in this browser tab until reload.",
                source: "Portal Copilot · help",
              });
              setOpen(false);
            }}
          >
            <CircleHelp size={16} /> Help & shortcuts <ArrowUpRight size={13} />
          </button>
          <div className="copilot-profile">
            <span>{name.charAt(0).toUpperCase()}</span>
            <div>
              <b>{name}</b>
              <small>Local workspace</small>
            </div>
            <span className="copilot-dot" />
          </div>
        </div>
      </aside>
      {open && (
        <button
          className="copilot-backdrop"
          aria-label="Dismiss navigation"
          onClick={close}
        />
      )}
      <div className="copilot-main" inert={open}>
        <header className="copilot-topbar">
          <div>
            <button
              id="copilot-menu"
              className="copilot-menu"
              aria-label="Open navigation"
              aria-expanded={open}
              onClick={() => {
                setOpen(true);
                requestAnimationFrame(() =>
                  document
                    .querySelector<HTMLButtonElement>(".copilot-close")
                    ?.focus(),
                );
              }}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <span className="copilot-divider">/</span>
            <b>Portal Copilot</b>
            <span className="copilot-alpha">ALPHA</span>
          </div>
          <button
            className="copilot-system"
            onClick={() => navigate("founder")}
          >
            <span className="copilot-dot" />
            {issues ? `${issues} system issues` : "Workspace connected"}
            <ArrowUpRight size={12} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
