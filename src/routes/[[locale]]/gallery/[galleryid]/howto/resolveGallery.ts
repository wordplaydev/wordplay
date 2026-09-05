import type Gallery from '@db/galleries/Gallery';
import type { GalleryResult } from '@db/galleries/GalleryDatabase.svelte';

/**
 * What the how-to page should show for a gallery ID: the gallery, `null` for
 * "still finding out", or `undefined` for "there isn't one".
 *
 * The page used to answer from the local maps alone — the realtime listener's
 * `accessibleGalleries`/`expandedScopeGalleries` and the hydrated cache — and
 * to conclude "this space doesn't exist" the moment auth and hydration had both
 * settled without one. But those maps are fed by a snapshot, and a snapshot can
 * be slow, or lost with the listener that would have delivered it (a Firestore
 * listener ends on error and nothing re-subscribes it). A curator landing on
 * their own space then read that it did not exist, with no way back but a
 * reload, and every test locator on the page waited out its timeout.
 *
 * So ask the database instead of concluding from silence: `find` answers from
 * those same maps when they have it — no network — and otherwise reads the
 * document directly, which is authoritative and doesn't depend on the listener
 * being alive. That is also why 'unreachable' stays `null` rather than becoming
 * `undefined`: "we couldn't go look" is not "it isn't there", and the caller
 * re-runs this whenever the maps change, so a recovered connection resolves it.
 */
export default async function resolveGallery(
    galleryID: string,
    /** Whether either role-split map already holds it. */
    cached: boolean,
    /** Whether the user and the local cache have both settled. */
    ready: boolean,
    lookup: (id: string) => Promise<GalleryResult>,
): Promise<Gallery | null | undefined> {
    // Nothing local, and we don't yet know who the viewer is or what the cache
    // holds: keep loading rather than flashing "doesn't exist" at someone whose
    // own gallery is about to arrive.
    if (!cached && !ready) return null;

    const result = await lookup(galleryID);
    return result.kind === 'found'
        ? result.gallery
        : result.kind === 'missing'
          ? undefined
          : null;
}
