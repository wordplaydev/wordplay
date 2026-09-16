import UnicodeString from '@unicode/UnicodeString';
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
 * Characters no file name may contain: the ASCII controls, DEL, and the nine
 * Windows forbids. The separator matters most — a project named `cats/dogs`
 * would otherwise become a folder.
 */
const Forbidden = /[\u0000-\u001f\u007f/\\:*?"<>|]+/g;

/** What Windows refuses at either end of a name, and what hides a file on
 *  every Unix if it leads. */
const Trimmed = /^[.\s-]+|[.\s-]+$/g;

/** Names MS-DOS reserved, which Windows still refuses with or without an
 *  extension. A project called `CON` is unlikely and costs one regex to
 *  survive. */
const Reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/** How much of a name a path keeps. Long enough to recognize a project by,
 *  short enough that the id, the extension, and the folders above it stay
 *  inside the path limits every desktop still has. */
const MaxGraphemes = 48;
const MaxBytes = 120;

const encoder = new TextEncoder();

/** As much of a name as a file system will safely carry, or the empty string
 *  when nothing of it survives. */
function safeName(name: string): string {
    // Normalize first: a decomposed name and a composed one are the same name,
    // and only one of them is what a file system will show back.
    const cleaned = new UnicodeString(name)
        .getText()
        .replace(Forbidden, '-')
        .replace(Trimmed, '');

    // Truncate by grapheme, never by code unit: a code-unit slice cuts
    // surrogate pairs in half and splits ZWJ sequences into their parts, and
    // Wordplay project names are very often a single emoji.
    let kept = new UnicodeString(cleaned).getGraphemes().slice(0, MaxGraphemes);

    // Then by bytes, because 48 graphemes of emoji is several hundred of them.
    while (kept.length > 0 && encoder.encode(kept.join('')).length > MaxBytes)
        kept = kept.slice(0, -1);

    const trimmed = kept.join('').replace(Trimmed, '');
    return Reserved.test(trimmed) ? `_${trimmed}` : trimmed;
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
