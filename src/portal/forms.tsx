import { useState } from "react";
export interface Field {
  name: string;
  label: string;
  type?: "text" | "number" | "datetime-local" | "checkbox" | "textarea";
  options?: readonly (string | { value: string; label: string })[];
  value?: string;
  optional?: boolean;
  min?: number;
  max?: number;
  step?: string;
}
export const sourceInputs: Field[] = [
  { name: "source", label: "Source reference (URL, document, or dataset)" },
  { name: "observedAt", label: "Observed at", type: "datetime-local" },
];
export function RecordForm({
  fields,
  submit,
  onSubmit,
}: {
  fields: Field[];
  submit: string;
  onSubmit: (values: Record<string, string>) => void;
}) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  return (
    <form
      className="portal-form"
      onSubmit={(event) => {
        event.preventDefault();
        setError("");
        setMessage("");
        try {
          onSubmit(
            Object.fromEntries(
              new FormData(event.currentTarget).entries(),
            ) as Record<string, string>,
          );
          setMessage("Done.");
        } catch (failure) {
          setError(
            failure instanceof Error
              ? failure.message
              : "Unable to save record.",
          );
        }
      }}
    >
      {fields.map((field) => (
        <label
          className={`field ${field.type === "textarea" ? "portal-wide" : ""}`}
          key={field.name}
        >
          <span>
            {field.label}
            {field.optional ? " (optional)" : ""}
          </span>
          {field.options ? (
            <select
              name={field.name}
              defaultValue={field.value}
              required={!field.optional}
            >
              {field.options.map((option) => (
                <option
                  key={typeof option === "string" ? option : option.value}
                  value={typeof option === "string" ? option : option.value}
                >
                  {typeof option === "string" ? option : option.label}
                </option>
              ))}
            </select>
          ) : field.type === "textarea" ? (
            <textarea
              name={field.name}
              defaultValue={field.value}
              maxLength={20000}
              required={!field.optional}
              rows={3}
            />
          ) : (
            <input
              name={field.name}
              type={field.type ?? "text"}
              defaultValue={field.type === "checkbox" ? undefined : field.value}
              defaultChecked={field.type === "checkbox" && field.value === "on"}
              required={field.type !== "checkbox" && !field.optional}
              min={field.min}
              max={field.max}
              step={field.step ?? (field.type === "number" ? "any" : undefined)}
              maxLength={200}
            />
          )}
        </label>
      ))}
      <div className="portal-wide">
        <button className="button primary" type="submit">
          {submit}
        </button>
      </div>
      {error && (
        <p className="portal-wide portal-error" role="alert">
          {error}
        </p>
      )}
      <p className="portal-wide" role="status">
        {message}
      </p>
    </form>
  );
}
