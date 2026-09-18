import type Gallery from './Gallery';
import { foldGalleryPath } from './galleryPath';
import type { GalleryFailure, GalleryResult } from './GalleryDatabase.svelte';

/**
 * What `/gallery/<segment>` should show. `redirect` is the one new answer a
 * vanity path adds: the segment resolved, but it isn't what this gallery is
 * called now — an older name, or its id once it has a name — so the page
 * resolves and then rewrites the address bar to the name.
 */
export type GalleryPathResult =
    | { kind: 'found'; gallery: Gallery }
    | { kind: 'redirect'; gallery: Gallery; to: string }
    | { kind: GalleryFailure };

/** The four ways to go looking, injected so this file stays pure. */
export type GalleryPathLookups = {
    /** Anything already held locally, matched by id, then folded path, then
     *  alias. No network — this is the only step that can answer for a
     *  curator's own private gallery, since the queries below cannot. */
    known: (segment: string, folded: string) => Gallery | undefined;
    /** The id read this route has always done. */
    byID: (id: string) => Promise<GalleryResult>;
    /** `path == folded && public == true`. */
    byPath: (folded: string) => Promise<GalleryResult>;
    /** `pathAliases array-contains folded && public == true`. */
    byAlias: (folded: string) => Promise<GalleryResult>;
};

/**
 * How a gallery answers to the segment asked for. Its stored path is already
 * folded, so this is a comparison rather than a search.
 *
 * Every way of finding a gallery ends here, so a gallery is only ever shown at
 * its canonical address. That includes being found by id: once a gallery has a
 * name, the id redirects to it, so a link handed out before the name existed
 * starts showing the name — and a curator who names a gallery while standing on
 * its id URL is moved to the name they just chose, which is the address they
 * are about to copy. An id with no name to redirect to answers as itself, which
 * is every gallery link that worked before this feature.
 */
function classify(
    gallery: Gallery,
    segment: string,
    folded: string,
): GalleryPathResult {
    const canonical = gallery.getCanonicalSegment();
    return canonical === segment ||
        canonical === folded ||
        // A private gallery's own path answers as itself rather than
        // redirecting to its id. The path is how its curator reached it and it
        // still resolves for them locally; `getLink` already hands them the id
        // as the address to share, which is the part that has to be right.
        gallery.getPath() === folded
        ? { kind: 'found', gallery }
        : { kind: 'redirect', gallery, to: gallery.getLink() };
}

/**
 * Resolve a `/gallery/<segment>` URL, where the segment may be an id, a vanity
 * path, or a path the gallery has since been renamed away from.
 *
 * Ordered by cost, and the order is load-bearing in one direction: the id read
 * comes before either query, so every link that worked before this feature
 * costs exactly what it used to. A path is only ever looked up once an id has
 * turned out not to exist.
 *
 * "We couldn't go look" survives the whole ladder. A step that came back
 * unreachable makes the final answer unreachable even if a later step merely
 * found nothing, because reporting 'missing' would tell a visitor their gallery
 * does not exist when the truth is that we lost the connection — the same
 * distinction resolveGallery.ts exists to preserve.
 */
export default async function resolveGalleryPath(
    segment: string,
    lookups: GalleryPathLookups,
): Promise<GalleryPathResult> {
    const folded = foldGalleryPath(segment);

    const local = lookups.known(segment, folded);
    if (local !== undefined) return classify(local, segment, folded);

    let unreachable = false;

    const byID = await lookups.byID(segment);
    if (byID.kind === 'found') return classify(byID.gallery, segment, folded);
    unreachable ||= byID.kind === 'unreachable';

    const byPath = await lookups.byPath(folded);
    if (byPath.kind === 'found')
        return classify(byPath.gallery, segment, folded);
    unreachable ||= byPath.kind === 'unreachable';

    // Only once nothing current answers to the name, so a gallery that has
    // reused a name it once held is never shadowed by its own history.
    const byAlias = await lookups.byAlias(folded);
    if (byAlias.kind === 'found')
        return classify(byAlias.gallery, segment, folded);
    unreachable ||= byAlias.kind === 'unreachable';

    return { kind: unreachable ? 'unreachable' : 'missing' };
}
