/**
 * The authority on what a gallery's vanity path may be (#180). Mirrored on the
 * client at src/db/galleries/galleryPath.ts, since `functions/` compiles with
 * rootDir "src" and neither side can import the other;
 * src/db/galleries/galleryPathSync.test.ts fails when the two disagree, the way
 * usernameSync.test.ts does for usernames.
 *
 * The client copy validates as you type; this one decides. A path that reaches
 * claimGalleryPath having skipped the form is checked here and nowhere else.
 *
 * A leaf module — no imports, and nothing from firebase-admin — so the root
 * vitest project can test it. CI's `npm ci` installs no functions/node_modules.
 */

/** The reservation index, keyed by the folded path. Named after the thing being
 *  claimed so a transaction's create is an atomic check-and-claim, exactly as
 *  `usernames/{folded}` is for handles. */
export const GalleryPathCollection = 'gallerypaths';

/**
 * Minimum length, in code points. Three rather than the username's five: a
 * gallery path is a phrase being shortened (`Ms Kim's 4th Period` → `kim-p4`),
 * and the five was chosen to protect accounts that already existed.
 */
export const GalleryPathMinLength = 3;

/** Maximum length, in code points. Long enough for a class and a period, short
 *  enough that the whole URL still reads as one glance. */
export const GalleryPathMaxLength = 40;

/**
 * How many superseded names a gallery keeps redirecting. A *reservation* is
 * given up only deliberately, by a curator releasing that name — never by
 * falling off this list, which is a convenience bounded because an unbounded
 * array rides on a document every visitor reads. Dropping the oldest redirect
 * costs a stale link; it never frees the name.
 */
export const MaxGalleryPathAliases = 10;

/**
 * Paths nobody may claim.
 *
 * Three groups, and the reasons differ:
 *
 * 1. The built-in example galleries' ids. Resolution tries the id first, so a
 *    cloud gallery claiming `Games` would hold a name that silently never
 *    resolves to it — a dead link rather than a refusal.
 * 2. Child route segments of `/gallery/[galleryid]/`. A future subroute would
 *    otherwise collide with a name already handed out.
 * 3. Names that read as first-party. `wordplay.dev/gallery/wordplay` is not a
 *    routing collision; it is an impersonation one. The only judgment call in
 *    the list, so it stays short.
 *
 * Deliberately NOT reserved:
 *
 * - **Top-level route names.** Putting vanity names under `/gallery/` rather
 *   than at the root is what makes them unable to collide with `/play` or
 *   `/login`. Reserving those here would re-import the problem the URL shape
 *   was chosen to avoid.
 * - **Locale codes.** The locale segment sits *before* `gallery` in the route,
 *   so `/es-MX/gallery/es-MX` is unambiguous — mildly confusing, not broken.
 *
 * Every entry is stored folded, and galleryPathSync.test.ts holds the list
 * against the example galleries so a new one can't be added without reserving
 * its id.
 */
export const ReservedGalleryPaths: readonly string[] = [
    // The built-in example galleries (src/examples/examples.ts).
    'games',
    'visualizations',
    'motion',
    'music',
    'av',
    'stories',
    'tools',
    // Child routes of /gallery/[galleryid]/.
    'howto',
    // First-party.
    'wordplay',
    'admin',
    'moderate',
    'official',
];

/** Everything a path may be made of, minus the separator. */
const Charset = /^[\p{L}\p{M}\p{N}-]+$/u;

/** A separator may not lead, trail, or double: `--` and ` - ` are the shapes
 *  that let two different-looking names fold onto one reading. */
const SeparatorMisuse = /^-|-$|--/u;

/**
 * The opening of a Firestore UUID. Resolution tries the id before the path, so
 * a path shaped like one could never be reached — better to refuse it than to
 * hand someone a name that silently does nothing.
 */
const UUIDShape = /^[0-9a-f]{8}-[0-9a-f]{4}-/u;

/**
 * The key a path is reserved under, so `Games` and `games` cannot both exist.
 * Identical to foldUsername, and for the same two reasons: locale-independent
 * `toLowerCase`, so a Turkish-locale machine cannot fold `I` differently; and
 * not a mark-stripping fold, which would make `José` and `Jose` one name and
 * collapse Devanagari names whose matras are the whole difference between them.
 */
export function foldGalleryPath(text: string): string {
    return text.normalize('NFKC').toLowerCase().normalize('NFC');
}

/**
 * Whether a gallery path may be claimed.
 *
 * Three of `isValidUsername`'s rules are deliberately absent, because each was
 * there to make a username lex as a Wordplay name and a path is never lexed:
 *
 * - **`ƒø`** are excluded from usernames because both are ReservedSymbols. A
 *   path is not a token, so the exclusion has no reason here.
 * - **The single script run** (`LatinRun || !AnyLatin`) exists because
 *   `ReferenceNameRegExPattern` is `(?:Latin+|NonLatin+)`, so a mixed name
 *   silently truncates a `@username/Character` reference. Nothing resolves a
 *   path that way, and keeping the rule would be the difference between
 *   `日本語-ゲーム` being claimable and not.
 * - **The five-character minimum**, for the reason GalleryPathMinLength gives.
 *
 * What is kept is what actually guards a URL: the fold, NFKC-stability, and a
 * charset narrow enough that the displayed name and the reserved one agree.
 */
export function isValidGalleryPath(text: string): boolean {
    const points = [...text];
    if (
        points.length < GalleryPathMinLength ||
        points.length > GalleryPathMaxLength
    )
        return false;
    // NFKC-stable, which subsumes NFC and refuses a compatibility spoof: both
    // full-width `Ｇａｍｅｓ` and math-bold `𝐠𝐚𝐦𝐞𝐬` fold onto `games`. A URL is
    // exactly where a name that displays as one thing and reserves another is
    // worth something to someone.
    if (text.normalize('NFKC') !== text) return false;
    if (!Charset.test(text)) return false;
    if (SeparatorMisuse.test(text)) return false;
    const folded = foldGalleryPath(text);
    if (UUIDShape.test(folded)) return false;
    return !ReservedGalleryPaths.includes(folded);
}

/**
 * The nearest claimable spelling of a name, or something still unclaimable when
 * there isn't one — so the caller checks the result rather than trusting it.
 *
 * Unlike repairUsername, this one *replaces* rather than only stripping: a
 * gallery's real name is usually a phrase ("Ms Kim's 4th Period"), and a repair
 * that deleted the spaces would give back `mskims4thperiod`. Turning each run of
 * anything unusable into the separator is what makes the suggestion worth
 * offering.
 */
export function repairGalleryPath(name: string): string {
    return foldGalleryPath(name)
        .replace(/[^\p{L}\p{M}\p{N}-]+/gu, '-')
        .replace(/-+/gu, '-')
        .replace(/^-|-$/gu, '')
        .slice(0, GalleryPathMaxLength)
        .replace(/-$/u, '');
}
