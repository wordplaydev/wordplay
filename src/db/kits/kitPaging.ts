/**
 * The parts of registry paging that can be wrong without anyone noticing (#8).
 *
 * Pure, and separate from `KitDatabase`, because each of these has a silent failure:
 * a cursor that doesn't advance loops forever, and a page appended without de-duplication
 * shows the same kit twice.
 */

/**
 * Where a page of the registry stopped.
 *
 * The two values the order is over, as plain data rather than a Firestore snapshot, so
 * nothing outside the database has to know what a snapshot is. The document id is in here
 * because `updated` is a millisecond: two kits published in the same one would make
 * `startAfter(updated)` skip whichever came second.
 */
export type KitCursor = { updated: number; id: string };

/** How many kits a page of the registry holds. Matches the guide's own result page. */
export const KITS_PAGE = 25;

/**
 * The cursor that continues after these documents, or `undefined` when they are the end.
 *
 * Built from the raw documents rather than the parsed kits: a page whose documents all
 * fail to parse would otherwise leave the cursor where it was, and the sentinel would ask
 * for the same page forever.
 */
export function nextCursor(
    docs: { updated: unknown; id: string }[],
    size: number,
): KitCursor | undefined {
    if (docs.length < size) return undefined;
    const last = docs[docs.length - 1];
    if (last === undefined) return undefined;
    // Tested, not coerced: `Number(null)` is 0, which is finite and would send the next
    // page to the beginning of time.
    return typeof last.updated === 'number' && Number.isFinite(last.updated)
        ? { updated: last.updated, id: last.id }
        : undefined;
}

/**
 * One page appended to what is already shown, without repeats.
 *
 * `updated` is a mutable sort key, so a kit republished while someone is scrolling can
 * come back on a later page as well as an earlier one. A skip is invisible; a duplicate
 * is not.
 */
export function appendKits<Kit extends { id: string }>(
    existing: Kit[],
    page: Kit[],
): Kit[] {
    const seen = new Set(existing.map((kit) => kit.id));
    return [...existing, ...page.filter((kit) => !seen.has(kit.id))];
}

/** One page of the registry, and the cursor that continues it. */
export type KitPage<Kit = unknown> = {
    kits: Kit[];
    /** Pass as `after` for the next page; `undefined` when the registry is exhausted. */
    cursor: KitCursor | undefined;
};
