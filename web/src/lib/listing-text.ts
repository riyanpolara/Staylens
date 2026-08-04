/**
 * Strips the HTML left in listing prose by the import.
 *
 * The descriptions come from scraped Airbnb data, where hosts typed into a rich
 * text box. The markup survived the import as literal characters, so the
 * property page was rendering `-THE BEST VIEW OF BANGKOK-<br />⭐ 5 star…`.
 *
 * Measured across every row of every affected table:
 *
 *   properties        2,328 of 6,480    <br /> 11,267, <br> 12, <b> 2, <a> 1
 *   reviews.comments  4,106 of 43,307   <br/>   8,956
 *   hosts.about           3 of 5,376    <b> 15, </b> 18, <br /> 6
 *
 * and no HTML entities anywhere. So this handles line breaks as the real case
 * and everything else as the tail — it is not, and does not need to be, a
 * general HTML parser.
 *
 * Cleaning happens here at read time rather than in a migration, deliberately:
 * the source rows stay intact, and a re-import of the dataset cannot quietly
 * reintroduce the problem the way a one-off UPDATE would let it.
 */

/** `<br>`, `<br/>`, `<br />`, `</br>` — every spelling that appears. */
const BREAK = /<\s*\/?\s*br\s*\/?\s*>/gi;

/**
 * An unterminated `<br` — a break whose `>` never made it through the import.
 *
 * One host bio reads `…MEZUN OLDUM. <br / (Website hidden by Airbnb) 2006
 * Yılından beri…`: Airbnb's redaction notice landed inside the tag. Handled
 * explicitly so the sentence after it survives.
 */
const DANGLING_BREAK = /<\s*br\s*\/?(?!\s*>)/gi;

/**
 * Any remaining tag. Inner text is kept: `<b>Stylish</b>` → `Stylish`.
 *
 * The body is `[^<>]*`, not `[^>]*`. With the looser form, the malformed bio
 * above matches from `<br /` all the way to the next `<b>`, deleting the host's
 * own words along with it. A tag body cannot contain `<`, so requiring that
 * makes an unclosed tag fail to match rather than eat the paragraph.
 */
const TAG = /<\/?[a-zA-Z][^<>]*>/g;

/**
 * Turns listing prose into plain text with real line breaks.
 *
 * Breaks become newlines rather than being deleted — they are the only
 * structure this text has. Removing them outright would run the host's list
 * together into "…views of the river✓FREE VIP PICK-UP✓Spectacular views…",
 * which is worse than the markup was. Every surface that renders this already
 * uses `whitespace-pre-line`, so the newlines show up as the intended lines.
 */
export function cleanListingText(text: string | null | undefined): string {
  if (!text) return "";
  return (
    text
      .replace(BREAK, "\n")
      // After the well-formed ones, so this only ever sees genuine leftovers.
      .replace(DANGLING_BREAK, "\n")
      .replace(TAG, "")
      // Hosts padded their lists with runs of breaks; more than one blank line
      // is just a gap on the page.
      .replace(/\n{3,}/g, "\n\n")
      // Trailing spaces are left over from where a tag used to be.
      .replace(/[ \t]+$/gm, "")
      .trim()
  );
}

/** Nullable variant, for fields that mean something different when absent. */
export function cleanListingTextOrNull(text: string | null | undefined): string | null {
  const cleaned = cleanListingText(text);
  return cleaned.length > 0 ? cleaned : null;
}
