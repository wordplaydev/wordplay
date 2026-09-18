import { where } from 'firebase/firestore';
import type GalleryDatabase from './GalleryDatabase.svelte';
import { foldGalleryPath } from './galleryPath';
import resolveGalleryPath, {
    type GalleryPathResult,
} from './resolveGalleryPath';

/**
 * Resolve a `/gallery/<segment>` URL, where the segment may be an ID, a vanity
 * path, or a name the gallery has since been renamed away from (#180).
 *
 * A module of its own rather than a method on GalleryDatabase, because the
 * database is on every page's import graph and this is not: only the two
 * gallery routes resolve a segment. Keeping it here is what stops the fold and
 * the ladder being carried by pages that never look a gallery up by name
 * (importGraph.test.ts is what would notice).
 *
 * The ladder itself is in resolveGalleryPath, which is pure; this supplies the
 * four ways to go looking.
 */
export default function findGalleryByPath(
    galleries: GalleryDatabase,
    segment: string,
): Promise<GalleryPathResult> {
    return resolveGalleryPath(segment, {
        known: (id, folded) =>
            galleries.getKnown(id) ?? galleries.getKnownByPath(folded),
        byID: (id) => galleries.find(id),
        byPath: (folded) =>
            galleries.findPublicWhere(where('path', '==', folded)),
        byAlias: (folded) =>
            galleries.findPublicWhere(
                where('pathAliases', 'array-contains', folded),
            ),
    });
}

export { foldGalleryPath };
