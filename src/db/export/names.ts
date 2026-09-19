import safeName from '@util/fileNames';
import { first } from '@util/nullable';
import type { Relationship } from './AccountSnapshot';

/**
 * Which relationship names a file's folder when several are true at once.
 *
 * Only the path has to choose — each collection's `index.json` carries the full
 * list — so this is about which folder a creator would look in first. Ordered
 * from the strongest claim on a thing to the weakest.
 *
 * `curator` outranks `creator` because of what those words mean in the data
 * rather than how they sound: a gallery's curators run it, while its creators
 * may only add projects to it. A how-to's `creator` is its author, but a how-to
 * has no curators, so it still wins there.
 */
export const RelationshipPrecedence: readonly Relationship[] = [
    'owner',
    'curator',
    'teacher',
    'creator',
    'collaborator',
    'commenter',
    'participant',
    'learner',
    'viewer',
] as const;

/** The folder a document goes in. Falls back to `viewer` — the weakest claim —
 *  rather than throwing: a document with no recognized relationship still
 *  arrived from a query we ran, so it belongs in the archive somewhere. */
export function primaryRelationship(
    relationships: readonly Relationship[],
): Relationship {
    return (
        RelationshipPrecedence.find((r) => relationships.includes(r)) ??
        'viewer'
    );
}

/**
 * A file name for one document: as much of its name as will safely fit, then
 * the first eight characters of its id.
 *
 * The id is always there, and that is what makes three problems one. A project
 * may have no name at all, or a name made entirely of characters a file system
 * refuses; two projects are very often called the same thing; and a reader
 * holding `index.json` needs to find the file it names. An id suffix answers
 * all three, and it needs no word like `untitled` — an archive path is data,
 * not interface text, and a localized one would differ between two exports of
 * the same account.
 */
export function slugForName(name: string, id: string): string {
    const safe = safeName(name);
    const short = id.slice(0, 8);
    if (short.length === 0) return safe;
    return safe.length === 0 ? short : `${safe}-${short}`;
}

/**
 * The archive's own name, and the folder every entry sits under so unzipping
 * never scatters files across a Downloads folder.
 *
 * `exportedAt` is an ISO timestamp; the date alone is what a creator reads, and
 * it makes two archives sort next to each other.
 */
export function archiveFolder(username: string, exportedAt: string): string {
    const safe = safeName(username);
    const date = first(exportedAt.split('T')) ?? exportedAt;
    return safe.length === 0 ? `wordplay-${date}` : `wordplay-${safe}-${date}`;
}
