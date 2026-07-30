"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWishlist } from "@/components/wishlist/wishlist-provider";

/**
 * The heart. One component for every surface that shows a property.
 *
 * State comes from the shared wishlist store rather than a prop, so the same
 * property saved in a search result is instantly filled in a carousel below it,
 * and the pages stay statically renderable.
 */
export function WishlistButton({
  propertyId,
  variant = "overlay",
  className,
}: {
  propertyId: string;
  /** overlay — floating on a card image. inline — a labelled button. */
  variant?: "overlay" | "inline";
  className?: string;
}) {
  const { isSaved, toggle, pendingIds } = useWishlist();
  const saved = isSaved(propertyId);
  const pending = pendingIds.has(propertyId);

  function onClick(e: React.MouseEvent) {
    // Cards wrap the whole tile in a link — saving must not open the property.
    e.preventDefault();
    e.stopPropagation();
    void toggle(propertyId);
  }

  const label = saved ? "Remove from wishlist" : "Save to wishlist";

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        aria-label={label}
        disabled={pending}
        className={cn(
          "flex items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline transition-all disabled:opacity-60",
          className,
        )}
      >
        <Heart
          aria-hidden
          className={cn("size-5", saved && "fill-current text-destructive")}
          strokeWidth={2}
        />
        {saved ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={label}
      disabled={pending}
      className={cn(
        "absolute top-4 right-4 z-10 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors disabled:opacity-70",
        className,
      )}
    >
      <Heart
        aria-hidden
        className={cn(
          "size-5 transition-all",
          saved && "fill-destructive text-destructive",
        )}
        strokeWidth={2}
      />
    </button>
  );
}
