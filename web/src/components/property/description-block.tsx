"use client";

import { useState } from "react";

/** "About this place" with an expandable long description. */
export function DescriptionBlock({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 380;
  const shown = expanded || !long ? text : text.slice(0, 380).trimEnd() + "…";

  return (
    <section aria-labelledby="about-heading">
      <h2 id="about-heading" className="font-display text-xl md:text-2xl font-semibold text-primary mb-4">
        {title}
      </h2>
      <p className="text-lg text-on-surface-variant leading-relaxed whitespace-pre-line">
        {shown}
      </p>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-4 text-primary font-semibold border-b-2 border-primary hover:border-primary-container transition-colors"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </section>
  );
}
