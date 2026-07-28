"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

/**
 * Modal shell for the user-details panel.
 *
 * The panel's open/closed state lives in the URL (`?user=<id>`), not in client
 * state, so the server renders the contents and a profile is linkable,
 * refreshable and back-button-correct. This component only supplies the modal
 * behaviour the URL cannot: Escape to close, a click-away scrim, a scroll lock,
 * and moving focus into the dialog when it opens.
 */
export function UserModalShell({
  closeHref,
  titleId,
  children,
}: {
  closeHref: string;
  titleId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  const close = () => router.push(closeHref, { scroll: false });

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      // A confirm dialog opened from inside the panel stops this in the capture
      // phase, so one Escape does not close both.
      if (event.key === "Escape") router.push(closeHref, { scroll: false });
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router, closeHref]);

  // The table behind the panel must not scroll under it.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Focus the panel itself rather than the first control, so a screen reader
  // announces the heading before the actions.
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <div className="admin-us-overlay">
      {/* A real button, so click-away is reachable by keyboard too. */}
      <button
        type="button"
        className="admin-us-scrim"
        aria-label="Close user details"
        onClick={close}
      />
      <div
        ref={panelRef}
        className="card elev-lg admin-us-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <Link
          href={closeHref}
          scroll={false}
          className="btn btn-icon admin-us-panel-close"
          aria-label="Close user details"
        >
          <X size={18} aria-hidden />
        </Link>
        {children}
      </div>
    </div>
  );
}
