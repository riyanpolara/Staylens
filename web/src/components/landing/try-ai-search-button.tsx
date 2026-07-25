"use client";

/**
 * Landing CTA "Try AI Search" — instead of navigating away, it scrolls back to
 * the hero and opens the header search bar (SiteHeader listens for this event).
 */
export function TryAiSearchButton() {
  function openSearch() {
    window.dispatchEvent(new CustomEvent("staylens:open-search"));
  }

  return (
    <button
      type="button"
      onClick={openSearch}
      className="px-[38px] py-[18px] rounded-full font-semibold text-[17px] text-white border transition-colors duration-300 hover:bg-white/25"
      style={{
        background: "rgba(255,255,255,.14)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderColor: "rgba(255,255,255,.4)",
      }}
    >
      Try AI Search
    </button>
  );
}
