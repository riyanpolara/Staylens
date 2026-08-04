import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MatchScore } from "@/lib/queries";

/**
 * AI Match — the hybrid ranking engine's score, shown with its reasons.
 *
 * The number is `Σ weight × signal` from `ranking_engine.py`, rounded. Nothing
 * here computes or adjusts it; this file only renders what the engine decided,
 * so the badge and the ranking can never disagree.
 *
 * The explanation is not optional decoration. A percentage with no reasons is
 * exactly the unfalsifiable number this feature is meant to avoid, so the badge
 * carries its ✓/✗ lines in the `title` (and, on the card variant, a hover
 * panel). If the engine returned no reasons, the badge does not render.
 */

/** Wording for the score. Bands, not adjectives invented per-property. */
function band(score: number): string {
  if (score >= 85) return "Excellent match";
  if (score >= 70) return "Great match";
  if (score >= 55) return "Good match";
  return "Partial match";
}

/** The reasons, split so mismatches are shown rather than quietly dropped. */
function split(explanation: string[]) {
  return {
    pros: explanation.filter((l) => l.startsWith("✓")),
    cons: explanation.filter((l) => l.startsWith("✗")),
  };
}

/**
 * The single strongest reason, for surfaces with no room and no hover.
 *
 * The engine emits its lines in weight order, so the first ✓ is the highest-
 * weighted signal that actually matched — the leading marker is stripped since
 * the line stands alone rather than in a checklist.
 */
export function matchReason(match: MatchScore | null | undefined): string | null {
  const first = match?.explanation.find((l) => l.startsWith("✓"));
  return first ? first.replace(/^✓\s*/, "") : null;
}

/**
 * Compact badge for a property card.
 *
 * `group-hover` is driven by the card, so the panel appears on card hover the
 * way the rest of the results UI behaves. It is `aria-hidden` because the same
 * text is already on the badge's accessible name — a screen reader should hear
 * it once, not twice.
 */
export function AiMatchBadge({
  match,
  className,
}: {
  match: MatchScore | null | undefined;
  className?: string;
}) {
  if (!match || match.explanation.length === 0) return null;
  const { pros, cons } = split(match.explanation);
  const label = `AI Match ${match.score}%. ${band(match.score)}. ${match.explanation.join(". ")}`;

  return (
    <span className={cn("relative inline-flex", className)}>
      <span
        // A title as well as the hover panel: it survives keyboard focus and
        // touch-hold, where a CSS-only panel does not.
        title={match.explanation.join("\n")}
        aria-label={label}
        className="inline-flex items-center gap-1 rounded-full bg-primary-container/90 backdrop-blur-sm px-2.5 py-1 text-xs font-bold text-on-primary-container"
      >
        <Sparkles aria-hidden className="size-3.5" />
        {match.score}% Match
      </span>

      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-full z-30 mt-2 hidden w-64 rounded-xl bg-surface-container-lowest p-3 text-left shadow-tinted-lg ring-1 ring-outline-variant/20 group-hover:block"
      >
        <span className="block text-xs font-bold text-on-surface">
          {match.score}% · {band(match.score)}
        </span>
        <span className="mt-1.5 block space-y-0.5">
          {pros.slice(0, 5).map((line) => (
            <span key={line} className="block text-xs text-on-surface-variant">
              {line}
            </span>
          ))}
          {cons.slice(0, 2).map((line) => (
            <span key={line} className="block text-xs text-on-surface-variant/80">
              {line}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}

/**
 * The full card for the property page, shown above amenities.
 *
 * Only rendered when the guest arrived from a search — a match score needs
 * something to match against, and a bare property page has no intent. The page
 * passes null otherwise and this renders nothing.
 */
export function AiMatchCard({ match }: { match: MatchScore | null | undefined }) {
  if (!match || match.explanation.length === 0) return null;
  const { pros, cons } = split(match.explanation);

  return (
    <section
      aria-labelledby="ai-match-heading"
      className="rounded-[20px] border border-outline-variant/30 bg-surface-container-low/60 p-5 md:p-6"
    >
      <div className="flex items-center gap-3">
        <span className="grid place-items-center size-10 rounded-full bg-primary-container text-on-primary-container">
          <Sparkles aria-hidden className="size-5" />
        </span>
        <div className="min-w-0">
          <h3
            id="ai-match-heading"
            className="font-display text-lg font-semibold text-on-surface"
          >
            AI Match
          </h3>
          <p className="text-sm text-on-surface-variant">
            Based on what you searched for
          </p>
        </div>
        <p className="ml-auto text-right">
          <span className="font-display text-3xl font-bold text-primary">
            {match.score}%
          </span>
          <span className="block text-xs font-semibold text-on-surface-variant">
            {band(match.score)}
          </span>
        </p>
      </div>

      <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
        {pros.map((line) => (
          <li key={line} className="text-sm text-on-surface">
            {line}
          </li>
        ))}
        {/* Mismatches are shown, not hidden — a score that only ever lists
            positives is advertising, not an explanation. */}
        {cons.map((line) => (
          <li key={line} className="text-sm text-on-surface-variant">
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}
