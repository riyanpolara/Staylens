import Image from "next/image";
import Link from "next/link";
import { hasRealAvatar, initialOf } from "@/lib/avatar";

/**
 * The account avatar in the top nav — now a link to the profile.
 *
 * It was a bare `<div>` wrapping an `<Image>`: it looked like a button, so
 * people clicked it, and nothing happened.
 *
 * When there is no uploaded picture it shows the initial rather than the stock
 * silhouette. `DEFAULT_AVATAR` is the same sentinel the profile-completion
 * meter already uses to decide whether a picture counts, so the two can't
 * disagree about what "has a photo" means. A real uploaded photo still wins —
 * replacing it with a letter would be a downgrade for anyone who set one.
 */

export function ProfileAvatarButton({
  avatarUrl,
  name,
  email = "",
  className,
}: {
  avatarUrl: string;
  name: string;
  email?: string;
  className?: string;
}) {
  const hasPhoto = hasRealAvatar(avatarUrl);
  // The name is the label when we have one; "Your profile" alone is useless to
  // a screen reader user checking which account they are signed in as.
  const label = name.trim() ? `Your profile, ${name.trim()}` : "Your profile";

  return (
    <Link
      href="/profile/edit"
      aria-label={label}
      title={label}
      className={`grid place-items-center size-10 shrink-0 rounded-full border-2 border-primary-container overflow-hidden transition-transform hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${className ?? ""}`}
    >
      {hasPhoto ? (
        <Image
          src={avatarUrl}
          alt=""
          width={40}
          height={40}
          unoptimized
          className="w-full h-full object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="grid place-items-center w-full h-full bg-primary-container text-on-primary-container font-display text-base font-bold leading-none select-none"
        >
          {initialOf(name, email)}
        </span>
      )}
    </Link>
  );
}
