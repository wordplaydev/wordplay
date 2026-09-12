import type Concept from '@concepts/Concept';
import conceptFor from '@concepts/conceptFor';
import Purpose from '@concepts/Purpose';
import type Locales from '@locale/Locales';
import type Context from '@nodes/Context';
import type Source from '@nodes/Source';

/**
 * What a kit offers whoever reads it, as concepts (#8) — only its `↑` exports, since a
 * kit's own helpers are not in scope for whoever borrows it and documenting them would
 * offer names that don't resolve.
 *
 * One function, so a kit's own page and a borrowing project's docs tile build the same
 * concepts and a kit's documentation cannot look different depending on where it was found.
 */
export function kitShareConcepts(
    source: Source,
    context: Context,
    locales: Locales,
): Concept[] {
    return source
        .getShares()
        .map((def) => conceptFor(def, Purpose.Kit, locales, context))
        .filter((concept): concept is Concept => concept !== undefined);
}
