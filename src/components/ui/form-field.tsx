import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

/**
 * Shared form-field primitives (UI Phase 3).
 *
 * One consistent control style for the public inquiry form and the auth
 * forms: 44px controls on mobile / 40px from sm, token-based borders,
 * navy focus ring, accessible required marking and error wiring.
 */

export const fieldClass =
  "min-h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-base text-ink shadow-xs transition-colors placeholder:text-faint focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10 sm:text-sm";

export const labelClass = "block text-sm font-medium text-ink";

export const helpTextClass = "mt-1.5 text-xs leading-5 text-muted";

export const errorTextClass =
  "mt-1.5 text-xs leading-5 font-medium text-danger";

/** Small uppercase section heading used to group related fields. */
export function FieldGroup({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={className}>
      <legend className="mb-3 w-full border-b border-line pb-2 text-xs font-semibold uppercase tracking-wider text-muted">
        {title}
      </legend>
      {description ? (
        <p className="mb-3 text-xs leading-5 text-muted">{description}</p>
      ) : null}
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}

type FieldBaseProps = {
  name: string;
  label: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  className?: string;
};

function RequiredMark({ required }: { required?: boolean }) {
  if (required) {
    return (
      <>
        {" "}
        <span
          className="text-danger"
          title="Required"
        >
          *
          <span className="sr-only">(required)</span>
        </span>
      </>
    );
  }
  return <span className="text-faint"> (optional)</span>;
}

/** Text-like field (text, email, tel, number, password). */
export function TextField({
  name,
  label,
  type = "text",
  required,
  error,
  helpText,
  className = "",
  ...inputProps
}: FieldBaseProps & {
  type?: "text" | "email" | "tel" | "number" | "search" | "url";
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "className" | "type">) {
  const autoId = useId();
  const id = inputProps.id ?? `${name}-${autoId}`;
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;

  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
        <RequiredMark required={required} />
      </label>
      <input
        {...inputProps}
        id={id}
        name={name}
        type={type}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [error ? errorId : null, helpText ? helpId : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className={`${fieldClass} mt-1.5 ${error ? "border-danger" : ""}`}
      />
      {helpText && !error ? (
        <p id={helpId} className={helpTextClass}>
          {helpText}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={errorTextClass}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Select field with consistent styling and a placeholder option. */
export function SelectField({
  name,
  label,
  options,
  required,
  error,
  helpText,
  placeholder,
  defaultValue = "",
  className = "",
  ...selectProps
}: FieldBaseProps & {
  options: ReadonlyArray<{ value: string; label: string }>;
  placeholder?: string;
  defaultValue?: string;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "className" | "children">) {
  const autoId = useId();
  const id = selectProps.id ?? `${name}-${autoId}`;
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;

  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
        <RequiredMark required={required} />
      </label>
      <select
        {...selectProps}
        id={id}
        name={name}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [error ? errorId : null, helpText ? helpId : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className={`${fieldClass} mt-1.5 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2378716c%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.65rem_center] bg-no-repeat pr-9 ${error ? "border-danger" : ""}`}
      >
        {placeholder ? (
          <option value="" disabled={required}>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helpText && !error ? (
        <p id={helpId} className={helpTextClass}>
          {helpText}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={errorTextClass}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Multi-line message field. */
export function TextareaField({
  name,
  label,
  required,
  error,
  helpText,
  className = "",
  ...textareaProps
}: FieldBaseProps & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className">) {
  const autoId = useId();
  const id = textareaProps.id ?? `${name}-${autoId}`;
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;

  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
        <RequiredMark required={required} />
      </label>
      <textarea
        {...textareaProps}
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [error ? errorId : null, helpText ? helpId : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className={`${fieldClass} mt-1.5 py-2.5 ${error ? "border-danger" : ""}`}
      />
      {helpText && !error ? (
        <p id={helpId} className={helpTextClass}>
          {helpText}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={errorTextClass}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Password input with a show/hide toggle for better password UX. */
export function PasswordField({
  name,
  label,
  required,
  error,
  helpText,
  className = "",
  autoComplete = "current-password",
  ...inputProps
}: FieldBaseProps & {
  autoComplete?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "className" | "type" | "autoComplete">) {
  const autoId = useId();
  const id = inputProps.id ?? `${name}-${autoId}`;
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;
  const [visible, setVisible] = useState(false);

  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
        <RequiredMark required={required} />
      </label>
      <div className="relative mt-1.5">
        <input
          {...inputProps}
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [error ? errorId : null, helpText ? helpId : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className={`${fieldClass} pr-11 ${error ? "border-danger" : ""}`}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-faint transition-colors hover:text-ink-secondary"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {helpText && !error ? (
        <p id={helpId} className={helpTextClass}>
          {helpText}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={errorTextClass}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
