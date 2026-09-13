/**
 * #907's permission checklist, written down once so that both enforcement points
 * are held to it: `tests/rules/howToRules.test.ts` drives this table against the
 * Firestore emulator, and `howToAccess.test.ts` drives it against the pure
 * predicates the UI gates on. A row is the statement; neither suite gets to
 * disagree with it quietly.
 *
 * Deliberately import-free plain TypeScript. `vitest.rules.config.ts` declares no
 * `resolve.alias`, so `tests/rules/**` reaches this file by relative path and
 * cannot follow a `@db/...` import out of it.
 */

/** Who is asking. `anon` is signed out; `mod` carries the moderator claim. */
export type Actor =
    | 'owner'
    | 'collaborator'
    | 'curator'
    | 'galleryCreator'
    | 'viewer'
    | 'stranger'
    | 'anon'
    | 'mod';

export const Actors: Actor[] = [
    'owner',
    'collaborator',
    'curator',
    'galleryCreator',
    'viewer',
    'stranger',
    'anon',
    'mod',
];

/**
 * What they are asking to do. `edit` is a whole-document write; `move` is the
 * `xcoord`/`ycoord` opening and `social` the `social` one, which are the two
 * narrow branches the rules admit for people who may not edit.
 *
 * `submit` is asking for the how-to to be listed in the guide (#906) — a write of
 * `submittedToGuide` alone. It goes exactly where `edit` goes, and the row exists
 * to say so: the field used to sit inside `social`, so everyone holding that
 * opening could submit someone else's work. Whether a submission is *ready*
 * (published, and public) is a separate question the form gates on and the
 * `howToEdited` trigger decides; it is not a permission, so it is not here.
 */
export type Action = 'read' | 'edit' | 'delete' | 'move' | 'social' | 'submit';

/**
 * `delete` is last on purpose: a suite that probes every action against one
 * fixture must not remove the document before the probes that follow it.
 */
export const Actions: Action[] = [
    'read',
    'edit',
    'move',
    'social',
    'submit',
    'delete',
];

/**
 * `read` is server-only: the client has no `canReadHowTo`, because what anyone
 * may read is decided by the subscriptions rather than by a predicate — the
 * three uid-scoped listeners, and since #1375 the per-gallery public watch that
 * a signed-out visitor gets. Adding a predicate with no call site would be a
 * claim nothing tests.
 */
export const ServerOnlyActions: Action[] = ['read'];

/**
 * `mod` is server-only: the claim lives on the auth token and the client's
 * predicates take only `(howTo, gallery, uid)`. A moderator's reach is the
 * moderation surfaces, not the how-to space's own affordances.
 */
export const ServerOnlyActors: Actor[] = ['mod'];

/** The how-to under test. */
export type HowToState = {
    published: boolean;
    /** Public independent of the gallery's permissions (schema v2). */
    isPublic: boolean;
    /** The creator's opt-out of the gallery-wide expanded scope. */
    scopeOverwrite: boolean;
};

/** The gallery it sits in. */
export type GalleryState = {
    public: boolean;
    /** Whether the curator has switched expanded how-to access on at all. */
    expandedVisibility: boolean;
};

export type Scenario = {
    /** Reads as the test name, so it should say what is being claimed. */
    name: string;
    howTo: HowToState;
    gallery: GalleryState;
    /** Everything not listed for an actor is denied. */
    allowed: Partial<Record<Actor, Action[]>>;
};

const Published = { published: true, isPublic: false, scopeOverwrite: false };
const Draft = { published: false, isPublic: false, scopeOverwrite: false };
const Private = { public: false, expandedVisibility: false };
const Expanded = { public: false, expandedVisibility: true };

/**
 * A collaborator may not delete: the delete rule reads the how-to's `creator`
 * and the gallery's curators, and nothing else. A gallery creator may not edit
 * the body but may move and react, which is what "can move any how-to" in #907
 * amounts to. A moderator may read and write but not delete — there is no mod
 * branch on delete, and taking a how-to down is `moderate.ts` setting
 * `published: false`, not a deletion.
 */
const OwnerAll: Action[] = [
    'read',
    'edit',
    'delete',
    'move',
    'social',
    'submit',
];
const CollaboratorAll: Action[] = ['read', 'edit', 'move', 'social', 'submit'];
const GalleryCreatorPublished: Action[] = ['read', 'move', 'social'];
const ModPublished: Action[] = ['read', 'edit', 'move', 'social', 'submit'];

export const Scenarios: Scenario[] = [
    {
        name: 'a published how-to in a private gallery',
        howTo: Published,
        gallery: Private,
        allowed: {
            owner: OwnerAll,
            collaborator: CollaboratorAll,
            curator: OwnerAll,
            galleryCreator: GalleryCreatorPublished,
            mod: ModPublished,
            // No expanded visibility, so a viewer is a stranger here.
        },
    },
    {
        name: 'a draft in a private gallery',
        howTo: Draft,
        gallery: Private,
        allowed: {
            owner: OwnerAll,
            collaborator: CollaboratorAll,
            // A curator may write a draft they may not read. That asymmetry is
            // #907's, not an oversight: "can edit any how-to in the gallery"
            // and "cannot see another creator's drafts" are both on the list.
            curator: ['edit', 'delete', 'move', 'social', 'submit'],
            mod: ModPublished,
        },
    },
    {
        name: 'a published how-to in a public gallery',
        howTo: Published,
        gallery: { public: true, expandedVisibility: false },
        allowed: {
            owner: OwnerAll,
            collaborator: CollaboratorAll,
            curator: OwnerAll,
            galleryCreator: GalleryCreatorPublished,
            mod: ModPublished,
            // Anyone may read a public gallery's published how-tos, and no one
            // outside it may touch them — #907's "the entire social pane should
            // be removed".
            viewer: ['read'],
            stranger: ['read'],
            anon: ['read'],
        },
    },
    {
        name: 'a draft in a public gallery (a public gallery must not expose drafts)',
        howTo: Draft,
        gallery: { public: true, expandedVisibility: false },
        allowed: {
            owner: OwnerAll,
            collaborator: CollaboratorAll,
            curator: ['edit', 'delete', 'move', 'social', 'submit'],
            mod: ModPublished,
        },
    },
    {
        name: 'a published how-to visible through expanded access',
        howTo: Published,
        gallery: Expanded,
        allowed: {
            owner: OwnerAll,
            collaborator: CollaboratorAll,
            curator: OwnerAll,
            galleryCreator: GalleryCreatorPublished,
            mod: ModPublished,
            // The whole point of expanded access: read and take part, but not
            // edit, delete, or move. #907: "cannot move any how-to, unless
            // added specifically as a collaborator".
            viewer: ['read', 'social'],
        },
    },
    {
        name: 'a published how-to whose creator opted out of expanded scope',
        howTo: { ...Published, scopeOverwrite: true },
        gallery: Expanded,
        allowed: {
            owner: OwnerAll,
            collaborator: CollaboratorAll,
            curator: OwnerAll,
            galleryCreator: GalleryCreatorPublished,
            mod: ModPublished,
        },
    },
    {
        name: 'a draft in a gallery with expanded access on',
        howTo: Draft,
        gallery: Expanded,
        allowed: {
            owner: OwnerAll,
            collaborator: CollaboratorAll,
            curator: ['edit', 'delete', 'move', 'social', 'submit'],
            mod: ModPublished,
        },
    },
    {
        name: 'a how-to published publicly on its own, in a private gallery',
        howTo: { ...Published, isPublic: true },
        gallery: Private,
        allowed: {
            owner: OwnerAll,
            collaborator: CollaboratorAll,
            curator: OwnerAll,
            galleryCreator: GalleryCreatorPublished,
            mod: ModPublished,
            viewer: ['read'],
            stranger: ['read'],
            anon: ['read'],
        },
    },
    {
        name: 'an unpublished how-to marked public (a draft is never public)',
        howTo: { ...Draft, isPublic: true },
        gallery: Private,
        allowed: {
            owner: OwnerAll,
            collaborator: CollaboratorAll,
            curator: ['edit', 'delete', 'move', 'social', 'submit'],
            mod: ModPublished,
        },
    },
];

/** Whether `actor` may do `action` in `scenario`. */
export function permits(
    scenario: Scenario,
    actor: Actor,
    action: Action,
): boolean {
    return (scenario.allowed[actor] ?? []).includes(action);
}

/**
 * Creating a how-to and configuring the space are decided by the gallery alone,
 * so they are their own small table rather than a column above.
 */
export const GalleryActions = ['create', 'configure'] as const;
export type GalleryAction = (typeof GalleryActions)[number];

/** Everything not listed is denied. A moderator has no create branch. */
export const GalleryPermissions: Partial<Record<Actor, GalleryAction[]>> = {
    curator: ['create', 'configure'],
    // A gallery creator posts how-tos but does not set the space's guiding
    // questions or reaction set — that is the curator's decision.
    galleryCreator: ['create'],
};
