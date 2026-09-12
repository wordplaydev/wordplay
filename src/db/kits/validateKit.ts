import type Conflict from '@conflicts/Conflict';
import type Source from '@nodes/Source';
import {
    getSourceShareConflicts,
    kitExports,
    type PublishedShare,
} from '@nodes/publishedShare';

/**
 * The name to record for an export, or the arrow for a conversion, which has none.
 *
 * The definition's *first* name rather than a locale-preferred one: this is stored on the
 * published version and shown in a registry the whole world reads, so it must not depend
 * on who is looking.
 */
export function exportName(exported: PublishedShare): string {
    return 'names' in exported
        ? (exported.names.getNames()[0] ?? '—')
        : exported.toWordplay().split('\n')[0].trim();
}

type KitReadiness = {
    /** Nothing is marked `↑`. The one problem with no node in the code to hang on. */
    empty: boolean;
    /** Everything else, as the conflicts the editor annotates once the kit exists. */
    conflicts: Conflict[];
};

/**
 * Whether a source is ready to be published as a kit.
 *
 * Almost every rule is a **conflict on the code it is about**, raised by
 * {@link getSourceShareConflicts}, so this returns the conflicts themselves rather than a
 * parallel vocabulary of problem kinds: the dialog renders each one's own localized
 * explanation, which is the same text the annotation shows.
 *
 * Name validity and uniqueness are deliberately *not* here — they need the database, and
 * they are the one check that can't be answered offline.
 */
export function checkKit(source: Source): KitReadiness {
    return {
        empty: kitExports(source).length === 0,
        conflicts: getSourceShareConflicts(source),
    };
}

/** True when a source is publishable as it stands. */
export function canPublishKit(source: Source): boolean {
    const { empty, conflicts } = checkKit(source);
    return !empty && conflicts.length === 0;
}
