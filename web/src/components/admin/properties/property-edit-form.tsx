"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updateProperty, type EditFormState } from "@/lib/admin/property-actions";
import { ROOM_TYPES } from "@/lib/admin/property-query";
import type { AdminPropertyDetail } from "@/lib/admin/properties";

/**
 * Edit form for a listing's descriptive, capacity and pricing fields.
 *
 * Moderation state (status, featured) is deliberately not here — it lives on
 * the property page where each transition has its own confirmation and audit
 * note, rather than being buried in a save.
 */

const nullable = (value: string | number | null | undefined) =>
  value === null || value === undefined ? "" : String(value);

export function PropertyEditForm({ property }: { property: AdminPropertyDetail }) {
  const [state, formAction, pending] = useActionState<EditFormState, FormData>(
    updateProperty,
    null,
  );

  return (
    <form action={formAction} className="card elev-sm admin-form">
      <input type="hidden" name="id" value={property.id} />

      <fieldset className="admin-fieldset" disabled={pending}>
        <legend className="card-kicker">Listing</legend>

        <div className="field admin-field-wide">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            name="title"
            className="input"
            required
            maxLength={200}
            defaultValue={property.title}
          />
        </div>

        <div className="field">
          <label htmlFor="room_type">Room type</label>
          <select
            id="room_type"
            name="room_type"
            className="input"
            defaultValue={property.room_type ?? ""}
          >
            <option value="">Not set</option>
            {ROOM_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="property_type">Property type</label>
          <input
            id="property_type"
            name="property_type"
            className="input"
            maxLength={80}
            defaultValue={nullable(property.property_type)}
          />
        </div>

        <div className="field admin-field-wide">
          <label htmlFor="summary">Summary</label>
          <textarea
            id="summary"
            name="summary"
            className="input"
            rows={3}
            defaultValue={nullable(property.summary)}
          />
        </div>

        <div className="field admin-field-wide">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            className="input"
            rows={6}
            defaultValue={nullable(property.description)}
          />
        </div>

        <div className="field admin-field-wide">
          <label htmlFor="house_rules">House rules</label>
          <textarea
            id="house_rules"
            name="house_rules"
            className="input"
            rows={3}
            defaultValue={nullable(property.house_rules)}
          />
        </div>
      </fieldset>

      <fieldset className="admin-fieldset" disabled={pending}>
        <legend className="card-kicker">Location</legend>

        <div className="field">
          <label htmlFor="city">City</label>
          <input id="city" name="city" className="input" defaultValue={nullable(property.city)} />
        </div>
        <div className="field">
          <label htmlFor="country">Country</label>
          <input id="country" name="country" className="input" defaultValue={nullable(property.country)} />
        </div>
        <div className="field admin-field-wide">
          <label htmlFor="street">Street</label>
          <input id="street" name="street" className="input" defaultValue={nullable(property.street)} />
        </div>
      </fieldset>

      <fieldset className="admin-fieldset" disabled={pending}>
        <legend className="card-kicker">Pricing</legend>

        <div className="field">
          <label htmlFor="price">Price per night</label>
          <input
            id="price"
            name="price"
            className="input"
            type="number"
            min="0"
            step="0.01"
            defaultValue={nullable(property.price_per_night)}
          />
        </div>
        <div className="field">
          <label htmlFor="currency">Currency</label>
          <input
            id="currency"
            name="currency"
            className="input"
            maxLength={3}
            pattern="[A-Za-z]{3}"
            defaultValue={property.currency}
          />
        </div>
        <div className="field">
          <label htmlFor="cleaning_fee">Cleaning fee</label>
          <input
            id="cleaning_fee"
            name="cleaning_fee"
            className="input"
            type="number"
            min="0"
            step="0.01"
            defaultValue={nullable(property.cleaning_fee)}
          />
        </div>
        <div className="field">
          <label htmlFor="security_deposit">Security deposit</label>
          <input
            id="security_deposit"
            name="security_deposit"
            className="input"
            type="number"
            min="0"
            step="0.01"
            defaultValue={nullable(property.security_deposit)}
          />
        </div>
        <div className="field">
          <label htmlFor="cancellation_policy">Cancellation policy</label>
          <input
            id="cancellation_policy"
            name="cancellation_policy"
            className="input"
            maxLength={80}
            defaultValue={nullable(property.cancellation_policy)}
          />
        </div>
      </fieldset>

      <fieldset className="admin-fieldset" disabled={pending}>
        <legend className="card-kicker">Capacity &amp; stay</legend>

        <div className="field">
          <label htmlFor="accommodates">Sleeps</label>
          <input id="accommodates" name="accommodates" className="input" type="number" min="0" defaultValue={nullable(property.accommodates)} />
        </div>
        <div className="field">
          <label htmlFor="bedrooms">Bedrooms</label>
          <input id="bedrooms" name="bedrooms" className="input" type="number" min="0" defaultValue={nullable(property.bedrooms)} />
        </div>
        <div className="field">
          <label htmlFor="beds">Beds</label>
          <input id="beds" name="beds" className="input" type="number" min="0" defaultValue={nullable(property.beds)} />
        </div>
        <div className="field">
          <label htmlFor="bathrooms">Bathrooms</label>
          <input id="bathrooms" name="bathrooms" className="input" type="number" min="0" step="0.5" defaultValue={nullable(property.bathrooms)} />
        </div>
        <div className="field">
          <label htmlFor="minimum_nights">Minimum nights</label>
          <input id="minimum_nights" name="minimum_nights" className="input" type="number" min="0" defaultValue={nullable(property.minimum_nights)} />
        </div>
        <div className="field">
          <label htmlFor="maximum_nights">Maximum nights</label>
          <input id="maximum_nights" name="maximum_nights" className="input" type="number" min="0" defaultValue={nullable(property.maximum_nights)} />
        </div>
      </fieldset>

      <footer className="admin-form-foot">
        {state && (
          <p className={`tag ${state.ok ? "tag-accent-2" : "tag-accent"}`} role="status">
            {state.message}
          </p>
        )}
        <Link className="btn btn-secondary" href={`/admin/properties/${property.id}`}>
          Cancel
        </Link>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </footer>
    </form>
  );
}
