import type Gallery from '@db/galleries/Gallery';
import { MaxHowToReposts } from '@db/rulesFields';
import type HowTo from './HowToDatabase.svelte';

/**
 * Who may do what with a how-to, in one place. These mirror the `match /howtos`
 * branches in `firestore.rules` and are held to the same table the rules tests
 * use (`howToAccessScenarios.ts`), so an affordance the interface offers and a
 * write the server will actually accept cannot drift apart — the silent-refusal
 * class of #1348-#1350, where a refused write leaves a document permanently
 * unsaved and says nothing.
 *
 * They were four `$derived` expressions spread across the how-to route's
 * components, one of which — `isCreatorCollaboratorViewer` — did not check the
 * how-to's own collaborators despite its name. As pure functions over documents
 * rather than component state they are testable in milliseconds, and they
 * outlive any redesign of the markup around them.
 */

/** `null` is a gallery still loading or out of reach; `undefined` is none. */
type MaybeGallery = Gallery | null | undefined;

/** A uid of `undefined` is a signed-out viewer, who may do none of this. */
type MaybeUser = string | undefined;

/** Curating the gallery — the widest gallery role. */
function curates(gallery: MaybeGallery, uid: MaybeUser): boolean {
    return uid !== undefined && !!gallery && gallery.hasCurator(uid);
}

/** Belonging to the gallery at all: curating it, or creating in it. */
function belongs(gallery: MaybeGallery, uid: MaybeUser): boolean {
    return (
        uid !== undefined &&
        !!gallery &&
        (gallery.hasCurator(uid) || gallery.hasCreator(uid))
    );
}

/**
 * The people a curator has opened this gallery's how-tos to. Empty unless the
 * curator switched expanded visibility on and this how-to's creator left the
 * gallery-wide scope in place.
 *
 * The list lives on the *gallery*, which is the only place it is ever written
 * (`galleryEdited` maintains it). It used to be read from a `viewersFlat` on the
 * how-to that nothing anywhere wrote, so expanded access did nothing at all
 * (#907).
 */
export function expandedViewersOf(
    howTo: HowTo,
    gallery: MaybeGallery,
): string[] {
    if (!gallery) return [];
    if (!gallery.getHowToExpandedVisibility()) return [];
    if (howTo.getScopeOverwrite()) return [];
    return gallery.getHowToViewers();
}

/** Posting a how-to is open to everyone the gallery belongs to. */
export function canCreateHowTo(gallery: MaybeGallery, uid: MaybeUser): boolean {
    return belongs(gallery, uid);
}

/**
 * The space's guiding questions and reaction set are the curator's decision and
 * not every creator's — one shared prompt is the point of them.
 */
export function canConfigureHowToSpace(
    gallery: MaybeGallery,
    uid: MaybeUser,
): boolean {
    return curates(gallery, uid);
}

/** Editing the words: the creator, a collaborator, or the gallery's curator. */
export function canEditHowTo(
    howTo: HowTo,
    gallery: MaybeGallery,
    uid: MaybeUser,
): boolean {
    if (uid === undefined) return false;
    return howTo.isCreatorCollaborator(uid) || curates(gallery, uid);
}

/**
 * Deleting is narrower than editing: the how-to's own creator, or the gallery's
 * curator. A collaborator may rewrite it but not destroy it.
 */
export function canDeleteHowTo(
    howTo: HowTo,
    gallery: MaybeGallery,
    uid: MaybeUser,
): boolean {
    if (uid === undefined) return false;
    return howTo.getCreator() === uid || curates(gallery, uid);
}

/**
 * Moving a tile is arranging the shared space, so it is open to everyone the
 * gallery belongs to — but not to an expanded-access viewer, who is a guest
 * here, and never on a draft, which nobody outside it can see to arrange.
 *
 * `gallery` is the space the tile is in. In a gallery it was reposted into, the
 * tile's place there is that gallery's to arrange and nobody else's (#1065):
 * editing the how-to is a right in its home, not in every space showing it.
 */
export function canMoveHowTo(
    howTo: HowTo,
    gallery: MaybeGallery,
    uid: MaybeUser,
): boolean {
    if (gallery && gallery.getID() !== howTo.getHowToGalleryId())
        return (
            howTo.isPublished() &&
            howTo.getReposts().includes(gallery.getID()) &&
            belongs(gallery, uid)
        );
    if (canEditHowTo(howTo, gallery, uid)) return true;
    return howTo.isPublished() && belongs(gallery, uid);
}

/**
 * Bookmarking, reacting, citing and chatting — everything in the social pane,
 * and so also who may be added as a collaborator. The widest of these: anyone
 * who can reach a published how-to may take part in it, an expanded-access
 * viewer included, which is what expanded access is for.
 */
export function canInteractSocially(
    howTo: HowTo,
    gallery: MaybeGallery,
    uid: MaybeUser,
): boolean {
    if (canEditHowTo(howTo, gallery, uid)) return true;
    if (uid === undefined || !howTo.isPublished()) return false;
    return (
        belongs(gallery, uid) ||
        expandedViewersOf(howTo, gallery).includes(uid) ||
        // Everyone a repost lets in (#1065), which the server keeps flat.
        howTo.getRepostReaders().includes(uid)
    );
}

/**
 * Who may ask for a how-to to be listed in the guide (#906).
 *
 * Exactly whoever may edit it, and deliberately not whoever may take part in it:
 * `submittedToGuide` used to live inside `social`, which the rules open to every
 * gallery member and expanded-access viewer, so anyone who could see a how-to
 * could submit someone else's work under their name.
 *
 * Whether a submission is *ready* — published, and public, so that what a
 * moderator approves is something the world can actually read — is a separate
 * question. The form gates its button on it and `howToEdited` decides it
 * server-side on every write, so it is not a permission and not here.
 */
export function canSubmitToGuide(
    howTo: HowTo,
    gallery: MaybeGallery,
    uid: MaybeUser,
): boolean {
    return canEditHowTo(howTo, gallery, uid);
}

/** Whether asking would mean anything yet: a moderator can only approve what a
 *  reader could then reach. */
export function howToIsReadyForGuide(howTo: HowTo): boolean {
    return howTo.isPublished() && howTo.isPublic();
}

/**
 * Reposting shares a published how-to into another gallery (#1065). Its home
 * keeps authority over it, so whoever reposts must be able to edit it there —
 * and must curate the destination, so nobody can put work into a space they
 * don't run. The server's repostHowTo callable asks the same questions.
 */
export function canRepostHowTo(
    howTo: HowTo,
    home: MaybeGallery,
    destination: MaybeGallery,
    uid: MaybeUser,
): boolean {
    if (!destination || !howTo.isPublished()) return false;
    const id = destination.getID();
    return (
        id !== howTo.getHowToGalleryId() &&
        !howTo.getReposts().includes(id) &&
        howTo.getReposts().length < MaxHowToReposts &&
        canEditHowTo(howTo, home, uid) &&
        curates(destination, uid)
    );
}

/**
 * Taking a repost back out: the destination's curators, since it is their
 * space, and whoever may edit the how-to, so an author can always withdraw
 * their work from wherever it was shared.
 */
export function canUnrepostHowTo(
    howTo: HowTo,
    home: MaybeGallery,
    destination: MaybeGallery,
    uid: MaybeUser,
): boolean {
    if (!destination || !howTo.getReposts().includes(destination.getID()))
        return false;
    return curates(destination, uid) || canEditHowTo(howTo, home, uid);
}

/** The galleries this person could repost this how-to into right now. */
export function repostDestinations(
    howTo: HowTo,
    home: MaybeGallery,
    galleries: Iterable<Gallery>,
    uid: MaybeUser,
): Gallery[] {
    return Array.from(galleries).filter((gallery) =>
        canRepostHowTo(howTo, home, gallery, uid),
    );
}

/**
 * Who belongs in the conversation about a how-to: everyone who may take part in
 * it socially. The server's repostHowTo callable states the same union, since
 * it has to add a destination's members the moment a how-to is reposted.
 */
export function howToChatParticipants(howTo: HowTo, home: Gallery): string[] {
    return [
        ...new Set([
            howTo.getCreator(),
            ...howTo.getCollaborators(),
            ...home.getCurators(),
            ...home.getCreators(),
            ...expandedViewersOf(howTo, home),
            ...howTo.getRepostReaders(),
        ]),
    ].sort();
}
