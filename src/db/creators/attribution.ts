import type { Visibility } from 'shared-types';

/**
 * Whether contributors are shown by the first few characters of their handle
 * rather than by the whole of it.
 *
 * Attribution follows visibility, the way responsibility does (#938): if anyone
 * at all can see the work, anyone can see who made it, and a handle stays inside
 * the group for as long as the work does. One rule rather than a judgment per
 * surface, because the surfaces had drifted — the public galleries page named
 * curators in full while the gallery's own page truncated the same people to four
 * characters, and a community how-to in the guide named nobody at all.
 *
 * `public || galleryPublic` is `getResponsibility`'s own `platform` test, and
 * using the same one is the point: a public gallery grants a visitor read on what
 * it holds, so the work in it is visible whether or not each piece says so itself.
 * A rule that asked only about `public` would credit nobody on a public gallery's
 * page while the public galleries listing named its curators in full, which is the
 * drift this replaces.
 *
 * `editable` is the other half — someone inside the work sees their collaborators
 * by name whether or not the world can.
 */
export function anonymizeContributors(
    visibility: Visibility,
    editable = false,
): boolean {
    return !(visibility.public || visibility.galleryPublic || editable);
}
