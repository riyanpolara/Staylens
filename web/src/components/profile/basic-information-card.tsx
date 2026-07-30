"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import type { ProfileFormValues } from "@/lib/profile-schema";

type RowName = "legalName" | "email" | "phone" | "location" | "emergencyContact";

const ROWS: {
  name: RowName;
  label: string;
  type?: string;
  empty?: string;
  addLabel?: string;
  /** Shown but not editable here (changing it is an auth flow, not a form post). */
  readOnly?: boolean;
  col: 0 | 1;
}[] = [
  { name: "legalName", label: "Legal Name", col: 0 },
  { name: "email", label: "Email Address", type: "email", readOnly: true, col: 0 },
  { name: "location", label: "Location", empty: "Not specified", addLabel: "Add", col: 0 },
  { name: "phone", label: "Phone Number", type: "tel", col: 1 },
  { name: "emergencyContact", label: "Emergency Contact", empty: "Not provided", addLabel: "Add", col: 1 },
];

/** Basic information with per-row inline editing and an "Edit All" toggle. */
export function BasicInformationCard() {
  const [editing, setEditing] = useState<Record<RowName, boolean>>({
    legalName: false,
    email: false,
    phone: false,
    location: false,
    emergencyContact: false,
  });
  const allOn = ROWS.filter((r) => !r.readOnly).every((r) => editing[r.name]);

  const toggleAll = () => {
    const next = !allOn;
    setEditing({
      legalName: next,
      email: false, // never editable — see ROWS
      phone: next,
      location: next,
      emergencyContact: next,
    });
  };

  return (
    <section className="bg-white rounded-[20px] p-6 md:p-16 shadow-tinted border border-outline-variant/10">
      <div className="flex justify-between items-center mb-10">
        <h2 className="font-display text-2xl font-semibold text-on-surface">Basic Information</h2>
        <button
          type="button"
          onClick={toggleAll}
          aria-pressed={allOn}
          className="text-primary text-sm font-semibold flex items-center gap-2 hover:underline transition-all"
        >
          <Pencil aria-hidden className="size-4" /> Edit All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-4">
        <div className="space-y-4">
          {ROWS.filter((r) => r.col === 0).map((r) => (
            <EditableRow
              key={r.name}
              {...r}
              editing={editing[r.name]}
              onEdit={() => setEditing((s) => ({ ...s, [r.name]: true }))}
            />
          ))}
        </div>
        <div className="space-y-4">
          {ROWS.filter((r) => r.col === 1).map((r) => (
            <EditableRow
              key={r.name}
              {...r}
              editing={editing[r.name]}
              onEdit={() => setEditing((s) => ({ ...s, [r.name]: true }))}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function EditableRow({
  name,
  label,
  type = "text",
  empty,
  addLabel,
  readOnly,
  editing,
  onEdit,
}: {
  name: RowName;
  label: string;
  type?: string;
  empty?: string;
  addLabel?: string;
  readOnly?: boolean;
  editing: boolean;
  onEdit: () => void;
}) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<ProfileFormValues>();
  const value = watch(name);
  const error = errors[name];

  return (
    <div>
      <label
        htmlFor={`field-${name}`}
        className="text-xs font-medium text-on-surface-variant block mb-1"
      >
        {label}
      </label>
      {editing && !readOnly ? (
        <div>
          <input
            id={`field-${name}`}
            type={type}
            aria-invalid={error ? true : undefined}
            {...register(name)}
            className={cn(
              "w-full py-2 px-3 rounded-lg bg-surface-container-lowest border text-base outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary",
              error ? "border-destructive" : "border-outline-variant/40",
            )}
          />
          {error?.message && (
            <p className="text-xs text-destructive mt-1">{error.message}</p>
          )}
        </div>
      ) : (
        <div className="flex justify-between items-center py-2 border-b border-outline-variant/20">
          <span className={cn("text-base", !value && "text-on-surface-variant")}>
            {value || empty}
          </span>
          {readOnly ? (
            // No control at all rather than one that quietly does nothing:
            // email changes have to go through Supabase's verification flow.
            <span className="text-xs text-on-surface-variant">Verified sign-in</span>
          ) : (
            <button
              type="button"
              onClick={onEdit}
              className="text-primary text-sm font-semibold hover:underline"
            >
              {value ? "Edit" : (addLabel ?? "Edit")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
