"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

/**
 * Modal shell for the booking detail panel.
 *
 * The panel's open/closed state lives in the URL (`?booking=<id>`), not in
 * client state, so the server renders the contents and a detail view is
 * linkable, refreshable and back-button-correct. This component only supplies
 * the modal behaviour the URL can't: Escape to close, a click-away scrim, a
 * scroll lock, and moving focus into the dialog when it opens.
 */
export function DetailShell({
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
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        router.push(closeHref, { scroll: false });
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router, closeHref]);

  // The list behind the panel must not scroll under it.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Focus the panel itself rather than the first control: a screen reader then
  // announces the dialog heading before the actions.
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <div className="admin-bk-overlay">
      {/* A real button, so click-away is reachable by keyboard too. */}
      <button
        type="button"
        className="admin-bk-scrim"
        aria-label="Close booking details"
        onClick={close}
      />
      <div
        ref={panelRef}
        className="card elev-lg admin-bk-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <Link
          href={closeHref}
          scroll={false}
          className="btn btn-icon admin-bk-panel-close"
          aria-label="Close booking details"
        >
          <X size={18} aria-hidden />
        </Link>
        {children}
      </div>
    </div>
  );
}
