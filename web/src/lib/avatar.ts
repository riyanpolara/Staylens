/**
 * Avatar helpers shared by the public nav and the admin header.
 *
 * Deliberately free of server imports: `lib/profile.ts` is `server-only`, and
 * the admin shell is a Client Component, so a single definition of "what counts
 * as a real picture" has to live somewhere both can reach. Everything here is
 * pure string work.
 */

/** Stock silhouette used when an account has never uploaded a picture. */
export const DEFAULT_AVATAR = "/images/default-avatar.svg";

/**
 * Whether there is a picture worth showing, as opposed to the stock silhouette.
 *
 * The profile-completion meter asks the same question, so both go through here
 * rather than each comparing against the sentinel themselves.
 */
export function hasRealAvatar(url: string | null | undefined): boolean {
  return Boolean(url) && url !== DEFAULT_AVATAR;
}

/**
 * First letter of the name, capitalised.
 *
 * Falls back to the email because a brand-new account has a session and an
 * address before it has ever filled in a name — the case where an empty circle
 * would look most broken. `?` is the last resort; it renders as a shape rather
 * than as blank space.
 *
 * Uses the code point, not `[0]`: an initial from an emoji or a non-BMP script
 * would otherwise be half a surrogate pair, which renders as a replacement box.
 */
export function initialOf(name: string, email = ""): string {
  const source = name.trim() || email.trim();
  const first = [...source][0];
  return first ? first.toUpperCase() : "?";
}
