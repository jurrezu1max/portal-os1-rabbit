import type { ReactNode } from "react";
import type { Field } from "./forms";
export const numeric = (
  name: string,
  label: string,
  max?: number,
  min = 0,
): Field => ({ name, label, type: "number", min, max });
export const txt = (name: string, label: string, optional = false): Field => ({
  name,
  label,
  optional,
});
export function Rows({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div
      className="portal-table-wrap"
      tabIndex={0}
      role="region"
      aria-label={headers.join(", ")}
    >
      <table className="portal-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th scope="col" key={h}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <p className="note portal-empty">{children}</p>;
}
export function Stat({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="portal-stat">
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
