import type Gallery from '@db/galleries/Gallery';
import type HowTo from '@db/howtos/HowToDatabase.svelte';
import type Project from '@db/projects/Project';
import type { Visibility } from 'shared-types';

/**
 * Build the `Visibility` of a thing, for `getResponsibility`.
 *
 * One place, so that every surface that tells a creator who reviews their work
 * — the share dialog, the gallery page, a chat, a how-to, the report button —
 * says the same thing, and says the same thing the server will enforce when
 * someone actually reports it. A surface that computed this for itself would
 * eventually promise a reviewer nobody assigned.
 */
export function projectVisibility(
    project: Project,
    gallery: Gallery | undefined,
): Visibility {
    return {
        public: project.isPublic(),
        gallery: project.getGallery(),
        galleryPublic: gallery?.isPublic() ?? false,
        galleryMembers: gallery
            ? [...gallery.getCurators(), ...gallery.getCreators()]
            : [],
        owner: project.getOwner(),
    };
}

export function galleryVisibility(gallery: Gallery): Visibility {
    return {
        public: gallery.isPublic(),
        gallery: gallery.getID(),
        galleryPublic: gallery.isPublic(),
        galleryMembers: [...gallery.getCurators(), ...gallery.getCreators()],
        // A gallery is curated rather than authored.
        owner: null,
    };
}

export function howToVisibility(
    howTo: HowTo,
    gallery: Gallery | undefined,
): Visibility {
    return {
        public: howTo.isPublic(),
        gallery: howTo.getHowToGalleryId(),
        galleryPublic: gallery?.isPublic() ?? false,
        galleryMembers: gallery
            ? [...gallery.getCurators(), ...gallery.getCreators()]
            : [],
        owner: howTo.getCreator(),
    };
}
