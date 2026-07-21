import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  title: string;
  subtitle?: string;
  /** id for the h3 — pair with aria-labelledby on the parent section */
  headingId?: string;
  /** optional "View all …" affordance shown on md+ screens */
  actionLabel?: string;
  actionHref?: string;
  align?: "left" | "center-mobile";
  className?: string;
};

export function SectionHeading({
  title,
  subtitle,
  headingId,
  actionLabel,
  actionHref = "#",
  align = "left",
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("flex justify-between items-end mb-10", className)}>
      <div className={cn(align === "center-mobile" && "w-full text-center md:text-left md:w-auto")}>
        <h3
          id={headingId}
          className="font-display text-2xl md:text-[32px] md:leading-10 font-bold text-on-surface"
        >
          {title}
        </h3>
        {subtitle && <p className="mt-1 text-on-surface-variant">{subtitle}</p>}
      </div>
      {actionLabel && (
        <a
          href={actionHref}
          className="group hidden md:flex items-center gap-2 text-primary font-semibold transition-all hover:gap-4 focus-visible:outline-2 focus-visible:outline-offset-4 rounded-sm"
        >
          {actionLabel}
          <ArrowRight aria-hidden className="size-5 transition-transform group-hover:translate-x-0.5" />
        </a>
      )}
    </div>
  );
}
