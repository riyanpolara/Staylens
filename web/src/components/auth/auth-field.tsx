import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/** Labeled input matching the Stitch auth design, with inline error + hint. */
export function AuthField({
  label,
  hint,
  error,
  className,
  ...props
}: {
  label: string;
  hint?: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  // A blank (whitespace) error marks the field red without its own message —
  // used for sign-in, where naming the wrong field would leak account info.
  const invalid = error !== undefined && error !== "";
  const message = error?.trim() ? error : null;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={props.id} className="block text-sm font-medium text-on-surface-variant ml-1">
        {label}
      </label>
      <input
        {...props}
        aria-invalid={invalid}
        aria-describedby={message && props.id ? `${props.id}-error` : undefined}
        className={cn(
          "w-full h-12 px-4 bg-surface-container-lowest rounded-[12px] text-on-surface",
          "placeholder:text-on-surface-variant/60 outline-none transition-all",
          invalid
            ? // red outline + soft red wash so the broken field is obvious
              "border-2 border-destructive bg-destructive/5 focus:ring-2 focus:ring-destructive/40 focus:border-destructive"
            : "border border-outline-variant focus:ring-2 focus:ring-primary/60 focus:border-primary",
        )}
      />
      {message ? (
        <p
          id={props.id ? `${props.id}-error` : undefined}
          className="flex items-start gap-1.5 text-[12px] font-medium text-destructive px-1"
        >
          <CircleAlert aria-hidden className="size-3.5 shrink-0 mt-px" />
          <span>{message}</span>
        </p>
      ) : hint ? (
        <p className="text-[11px] text-on-surface-variant/70 px-1">{hint}</p>
      ) : null}
    </div>
  );
}
