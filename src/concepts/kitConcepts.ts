import type Concept from '#concepts/Concept.ts';
import conceptFor from '#concepts/conceptFor.ts';
import Purpose from '#concepts/Purpose.ts';
import type Locales from '#locale/Locales.ts';
import type Context from '#nodes/Context.ts';
import type Source from '#nodes/Source.ts';

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
