import type { Responsibility, Visibility } from 'shared-types';

/**
 * Who is responsible for reviewing what's reported about a thing (#938).
 *
 * Responsibility follows visibility: nobody moderates what nobody else can
 * see, a gallery's curators moderate what their gallery holds, and Wordplay's
 * moderators moderate what the whole platform can reach. A thing can be both —
 * a public project inside a private gallery is platform-visible *and* has
 * curators present — so this is two independent tests rather than a four-way
 * switch.
 *
 * A chat inherits the visibility of the project or how-to it's about, and the
 * owner below is that parent's owner, not a message's author: a chat in a
 * teacher's gallery is moderated even when the author is its only other member.
 *
 * Keep in sync with src/db/moderation/responsibility.ts (the functions↔src wall
 * prevents a single shared module; responsibilitySync.test.ts holds both
 * copies to one table).
 */
export default function getResponsibility(v: Visibility): Responsibility {
    // Anyone at all can reach the thing, or the gallery holding it.
    const platform = v.public || v.galleryPublic;

    // A gallery only carries responsibility once someone besides the owner is
    // in it: a gallery of one is a folder, not a space.
    if (v.gallery !== null && (v.galleryPublic || galleryHasOthers(v)))
        return platform
            ? { kind: 'both', gallery: v.gallery }
            : { kind: 'curators', gallery: v.gallery };

    return platform ? { kind: 'platform' } : { kind: 'none' };
}

/** Whether anyone but the thing's owner can see the gallery it's in. */
function galleryHasOthers(v: Visibility): boolean {
    const members = new Set(v.galleryMembers);
    // More than one member is always someone else. One member who isn't the
    // owner is too — a project can sit in a gallery its owner doesn't belong
    // to, and the curator there is very much a third party.
    return members.size > 1 || (v.owner !== null && !members.has(v.owner));
}
