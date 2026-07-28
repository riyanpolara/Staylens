"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

/**
 * Safety net for anything the page's own error handling does not catch (a
 * render fault, a thrown detail fetch). Data-layer failures are handled inline
 * so the toolbar survives; this boundary is the last resort.
 */
export default function PropertiesError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[admin/properties] render failed:", error);
  }, [error]);

  return (
    <section className="admin-rise">
      <div className="card elev-sm admin-empty" role="alert">
        <span className="admin-empty-icon admin-empty-icon-warn" aria-hidden>
          <TriangleAlert size={26} />
        </span>
        <h2 className="card-title">Something went wrong</h2>
        <p className="text-muted">
          The Properties screen could not be rendered. {error.digest ? `Reference ${error.digest}.` : ""}
        </p>
        <button type="button" className="btn btn-primary" onClick={() => unstable_retry()}>
          Try again
        </button>
      </div>
    </section>
  );
}
