/**
 * The ids of the galleries Wordplay ships with — declared once, here.
 *
 * `examples.ts` names its galleries from this, and `galleryPath.ts` reserves
 * exactly these as vanity paths, since resolution tries an id before a path and
 * a cloud gallery that claimed `Games` would hold a name that never resolved to
 * it (#180).
 *
 * A leaf with no imports on purpose: reserving the ids must not put the
 * examples graph on every page that validates a path.
 */
export const ExampleGalleryIDs = [
    'Games',
    'Visualizations',
    'Motion',
    'Music',
    'AV',
    'Stories',
    'Tools',
] as const;

export type ExampleGalleryID = (typeof ExampleGalleryIDs)[number];
