/**
 * How requests to a translation backend are bounded. Dependency-free on purpose:
 * both the locale CLI (via ClaudeTranslator, which re-exports `chunkUnits`) and
 * the in-app project translator import this, and the latter must not pull the
 * Anthropic SDK into the browser bundle.
 */

/**
 * How many markup segments to send per request.
 *
 * Kept small on purpose. Segments are not uniform: a chunk of UI labels is a
 * few hundred characters, while a chunk of `@Music` documentation is thousands,
 * and at 100 segments the latter asked for ~11,000 characters of output in one
 * request — minutes of generation, with nothing printed until it landed. That
 * is what made a working run indistinguishable from a wedged one.
 */
export const CHUNK_SIZE = 25;
/**
 * Characters per request, alongside the segment cap.
 *
 * Segment count alone is the wrong bound: a request's cost is the text in it,
 * and 25 short segments and 25 long ones differ by an order of magnitude.
 * Measured on the slowest scripts (Gujarati, Kannada), a chunk runs about
 * 0.045s per source character — so 4,400 characters took ~200s and 8,000
 * blew through the 600s timeout three times before failing, losing the whole
 * chunk after half an hour. This keeps the worst case near 200s. Latin-script
 * locales rarely reach it (their chunks run 1,000–3,000 characters), so they
 * keep filling all 25 segments.
 */
export const CHUNK_CHARACTERS = 4_000;

/**
 * Group units into requests bounded by both segment count and character budget.
 * A single unit larger than the budget goes alone rather than being dropped.
 */
export function chunkUnits(
    units: string[],
    maxUnits = CHUNK_SIZE,
    maxCharacters = CHUNK_CHARACTERS,
): string[][] {
    const chunks: string[][] = [];
    let current: string[] = [];
    let characters = 0;
    for (const unit of units) {
        if (
            current.length > 0 &&
            (current.length >= maxUnits ||
                characters + unit.length > maxCharacters)
        ) {
            chunks.push(current);
            current = [];
            characters = 0;
        }
        current.push(unit);
        characters += unit.length;
    }
    if (current.length > 0) chunks.push(current);
    return chunks;
}

/** How many strings the in-app translator sends per request. */
export const BROWSER_CHUNK_SIZE = 25;
/**
 * Characters per in-app request — well under the CLI's budget.
 *
 * The bound here isn't cost but the two timeouts a browser call passes through:
 * the callable's own and the function's. A chunk this size stays around a minute
 * even on the slowest scripts, which also makes the progress bar move often
 * enough to read as progress rather than as a hung page (#1276).
 */
export const BROWSER_CHUNK_CHARACTERS = 2_000;
