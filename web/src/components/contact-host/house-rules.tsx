import { Clock, LogIn, PawPrint, Users, Volume2, type LucideIcon } from "lucide-react";

type Rule = { icon: LucideIcon; title: string; detail: string };

/**
 * House rules grid (Stitch). Derived from real signals where available
 * (guest capacity, pet/self-check-in amenities); the rest are standard
 * stay conventions.
 */
export function HouseRules({
  accommodates,
  amenitySlugs,
}: {
  accommodates: number | null;
  amenitySlugs: string[];
}) {
  const has = (s: string) => amenitySlugs.includes(s);
  const rules: Rule[] = [
    { icon: LogIn, title: "Check-in after 3:00 PM", detail: "Self check-in where available" },
    { icon: Clock, title: "Checkout before 11:00 AM", detail: "Message the host for late checkout" },
  ];
  if (accommodates != null)
    rules.push({
      icon: Users,
      title: `Up to ${accommodates} guest${accommodates === 1 ? "" : "s"}`,
      detail: "Small gatherings only — no large parties",
    });
  rules.push(
    has("pets-allowed")
      ? { icon: PawPrint, title: "Pets allowed", detail: "Well-behaved pets are welcome" }
      : { icon: Volume2, title: "Quiet hours", detail: "10:00 PM – 7:00 AM" },
  );

  return (
    <section aria-labelledby="rules-heading" className="space-y-4">
      <h3 id="rules-heading" className="font-display text-xl md:text-2xl font-semibold text-primary">
        House details and rules
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map((r) => (
          <div
            key={r.title}
            className="flex items-center gap-4 p-4 rounded-xl bg-surface-container-low border border-outline-variant/10"
          >
            <span className="w-12 h-12 flex items-center justify-center rounded-full bg-secondary-fixed/30 text-primary shrink-0">
              <r.icon aria-hidden className="size-6" strokeWidth={1.7} />
            </span>
            <div>
              <p className="font-semibold text-on-surface">{r.title}</p>
              <p className="text-sm text-on-surface-variant">{r.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
