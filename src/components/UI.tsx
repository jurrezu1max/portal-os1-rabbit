import type { ReactNode } from "react";
import { ArrowUpRight, CircleHelp } from "lucide-react";
export const number = (n: number | null, digits = 2) =>
  n === null
    ? "N/A"
    : Number.isFinite(n)
      ? n.toLocaleString("en-US", {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        })
      : "N/A";
export function Panel({
  title,
  eyebrow,
  action,
  children,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Metric({
  label,
  value,
  unit,
  caption,
  accent,
  help,
}: {
  label: string;
  value: string;
  unit?: string;
  caption: string;
  accent?: string;
  help: string;
}) {
  return (
    <div
      className="metric-card"
      style={{ "--accent": accent ?? "#4bdfbc" } as React.CSSProperties}
    >
      <div className="metric-label">
        {label}
        <span role="img" title={help} aria-label={help} tabIndex={0}>
          <CircleHelp size={12} />
        </span>
      </div>
      <div className="metric-value">
        {value}
        <span>{unit}</span>
      </div>
      <div className="metric-caption">
        <i />
        {caption}
      </div>
      <svg className="metric-decoration" viewBox="0 0 60 20" aria-hidden="true">
        <path
          d="M0 18h9l5-6h10l5-7h10l6 4h15"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
        />
      </svg>
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}
export function TextLink({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="text-link" onClick={onClick}>
      {children}
      <ArrowUpRight size={13} />
    </button>
  );
}
