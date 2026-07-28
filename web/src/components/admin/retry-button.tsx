"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

/** Re-runs the server render for the current URL, keeping every filter intact. */
export function RetryButton({ label = "Retry" }: { label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn btn-primary"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? "Retrying…" : label}
    </button>
  );
}
