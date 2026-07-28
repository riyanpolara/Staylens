"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkAdmin } from "@/lib/admin/auth";
import type { PropertyStatus } from "@/lib/admin/types";
import { PROPERTY_STATUSES, ROOM_TYPES } from "@/lib/admin/property-query";

/**
 * Mutations for the admin Properties screen.
 *
 * A Server Action is a public POST endpoint, so every one of these re-checks
 * `checkAdmin()` first — rendering the row menu behind an admin-gated layout is
 * not a security boundary. The client sends an id plus the change it wants;
 * everything else is read from the database, never from the request.
 * `properties` RLS (0013 + 0015) is the second lock: even a slip here cannot
 * write as a non-admin.
 */

export type ActionResult = { ok: true; message: string } | { ok: false; message: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NOT_ADMIN: ActionResult = {
  ok: false,
  message: "Your session is not an admin session. Sign in again.",
};

async function adminSession() {
  const check = await checkAdmin();
  return check.state === "admin" ? check.userId : null;
}

/** Postgres errors the admin can actually act on, in plain language. */
function describe(error: { code?: string; message: string }, fallback: string): string {
  switch (error.code) {
    case "23503":
      return "This listing has bookings attached, so it cannot be deleted. Suspend it instead.";
    case "23514":
      return "Those values fail a database rule — check the price and the night limits.";
    case "42501":
      return "Your account is not allowed to change this listing.";
    default:
      return error.message || fallback;
  }
}

function refresh(id?: string) {
  revalidatePath("/admin/properties");
  if (id) revalidatePath(`/admin/properties/${id}`);
}

/* ── Status ──────────────────────────────────────────────────────────── */

const STATUS_LABEL: Record<PropertyStatus, string> = {
  live: "published",
  pending: "moved back to review",
  suspended: "suspended",
  draft: "moved to draft",
};

/**
 * Set a listing's moderation status. `status` drives `is_active` through
 * trg_properties_status_sync, so anything other than `live` also drops the
 * listing out of public search and AI recommendations.
 */
export async function setPropertyStatus(
  id: string,
  status: PropertyStatus,
  note?: string,
): Promise<ActionResult> {
  const userId = await adminSession();
  if (!userId) return NOT_ADMIN;

  if (!UUID_RE.test(id)) return { ok: false, message: "Unknown listing." };
  if (!(PROPERTY_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, message: "Unknown status." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("properties")
    .update({
      status,
      moderation_note: note?.trim().slice(0, 500) || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId,
    })
    .eq("id", id);

  if (error) {
    console.error("[admin/properties] status change failed:", error);
    return { ok: false, message: describe(error, "Could not update the status.") };
  }

  refresh(id);
  return { ok: true, message: `Listing ${STATUS_LABEL[status]}.` };
}

/** Approve a submission: it goes live immediately and any rejection note clears. */
export async function approveProperty(id: string): Promise<ActionResult> {
  const result = await setPropertyStatus(id, "live");
  return result.ok ? { ok: true, message: "Listing approved and published." } : result;
}

/**
 * Reject a submission. The listing is suspended rather than deleted — the host
 * keeps their draft and the reason is recorded on the row for the audit trail.
 */
export async function rejectProperty(id: string, reason: string): Promise<ActionResult> {
  const trimmed = reason.trim();
  if (trimmed.length < 3) {
    return { ok: false, message: "Give a reason — the host is told why." };
  }
  const result = await setPropertyStatus(id, "suspended", trimmed);
  return result.ok ? { ok: true, message: "Listing rejected." } : result;
}

/* ── Feature ─────────────────────────────────────────────────────────── */

export async function setPropertyFeatured(
  id: string,
  featured: boolean,
): Promise<ActionResult> {
  const userId = await adminSession();
  if (!userId) return NOT_ADMIN;
  if (!UUID_RE.test(id)) return { ok: false, message: "Unknown listing." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("properties")
    .update({ is_featured: featured })
    .eq("id", id);

  if (error) {
    console.error("[admin/properties] feature toggle failed:", error);
    return { ok: false, message: describe(error, "Could not update the listing.") };
  }

  refresh(id);
  return { ok: true, message: featured ? "Listing featured." : "Listing unfeatured." };
}

/* ── Delete ──────────────────────────────────────────────────────────── */

/**
 * Permanent delete. Images, amenities, reviews, favourites and the embedding
 * cascade with it; a listing with bookings is refused by the FK (ON DELETE
 * RESTRICT) and surfaces as a "suspend it instead" message.
 */
export async function deleteProperty(id: string): Promise<ActionResult> {
  const userId = await adminSession();
  if (!userId) return NOT_ADMIN;
  if (!UUID_RE.test(id)) return { ok: false, message: "Unknown listing." };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("properties")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    console.error("[admin/properties] delete failed:", error);
    return { ok: false, message: describe(error, "Could not delete the listing.") };
  }
  if (!count) return { ok: false, message: "That listing no longer exists." };

  revalidatePath("/admin/properties");
  return { ok: true, message: "Listing deleted." };
}

/* ── Edit ────────────────────────────────────────────────────────────── */

function text(form: FormData, key: string, max: number): string | null {
  const value = form.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/**
 * Empty input means "no value", which is a legitimate NULL for these columns.
 * The failure branch is already an `ActionResult`, so callers can return it.
 */
function num(
  form: FormData,
  key: string,
): { ok: true; value: number | null } | { ok: false; message: string } {
  const raw = form.get(key);
  if (typeof raw !== "string" || raw.trim() === "") return { ok: true, value: null };

  const label = key.replace(/_/g, " ");
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return { ok: false, message: `${label} must be a number.` };
  if (parsed < 0) return { ok: false, message: `${label} cannot be negative.` };
  return { ok: true, value: parsed };
}

const NUMERIC_FIELDS = [
  "cleaning_fee", "security_deposit", "minimum_nights", "maximum_nights",
  "accommodates", "bedrooms", "beds", "bathrooms",
] as const;

export type EditFormState = ActionResult | null;

/**
 * Save the edit form. Only the columns below can be written — an extra field
 * POSTed by hand is ignored rather than trusted.
 */
export async function updateProperty(
  _prev: EditFormState,
  form: FormData,
): Promise<EditFormState> {
  const userId = await adminSession();
  if (!userId) return NOT_ADMIN;

  const id = form.get("id");
  if (typeof id !== "string" || !UUID_RE.test(id)) {
    return { ok: false, message: "Unknown listing." };
  }

  const title = text(form, "title", 200);
  if (!title) return { ok: false, message: "A listing needs a title." };

  const price = num(form, "price");
  if (!price.ok) return price;

  const numbers = {} as Record<(typeof NUMERIC_FIELDS)[number], number | null>;
  for (const field of NUMERIC_FIELDS) {
    const parsed = num(form, field);
    if (!parsed.ok) return parsed;
    numbers[field] = parsed.value;
  }

  const { minimum_nights: min, maximum_nights: max } = numbers;
  if (min !== null && max !== null && max < min) {
    return { ok: false, message: "Maximum nights cannot be below minimum nights." };
  }

  const roomTypeRaw = form.get("room_type");
  const room_type =
    typeof roomTypeRaw === "string" && (ROOM_TYPES as readonly string[]).includes(roomTypeRaw)
      ? (roomTypeRaw as (typeof ROOM_TYPES)[number])
      : null;

  // Read raw rather than through `text()` so "USDX" is rejected, not truncated.
  const currencyRaw = form.get("currency");
  const currencyInput = typeof currencyRaw === "string" ? currencyRaw.trim() : "";
  if (currencyInput && !/^[A-Za-z]{3}$/.test(currencyInput)) {
    return { ok: false, message: "Currency must be a 3-letter code, e.g. USD." };
  }
  const currency = currencyInput ? currencyInput.toUpperCase() : undefined;

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("properties")
    .update({
      name: title,
      summary: text(form, "summary", 2_000),
      description: text(form, "description", 8_000),
      house_rules: text(form, "house_rules", 4_000),
      property_type: text(form, "property_type", 80),
      room_type,
      city: text(form, "city", 120),
      country: text(form, "country", 120),
      street: text(form, "street", 240),
      cancellation_policy: text(form, "cancellation_policy", 80),
      price: price.value,
      ...(currency ? { currency } : {}),
      ...numbers,
    }, { count: "exact" })
    .eq("id", id);

  if (error) {
    console.error("[admin/properties] update failed:", error);
    return { ok: false, message: describe(error, "Could not save the listing.") };
  }
  if (!count) return { ok: false, message: "That listing no longer exists." };

  refresh(id);
  return { ok: true, message: "Changes saved." };
}
