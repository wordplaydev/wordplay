/**
 * Everything an account export gathers (#152), as plain data.
 *
 * Types only, and no imports from Firebase or the sync layer: this is the seam
 * that lets `archive.ts` and `readme.ts` be tested without a browser or an
 * emulator, and it is what `exportAccount.ts` fills in.
 */

/**
 * How a creator is tied to something in their archive.
 *
 * Several can be true of one document at once — a curator of a gallery may also
 * be one of its creators, and a teacher may be a learner in their own class —
 * so this is always carried as a list. The words are the ones the *data* uses
 * (`galleries.creators`, `howtos.creator`), which means `creator` means
 * different things in different collections; the archive's README is where that
 * is glossed, per collection.
 */
export type Relationship =
    | 'owner'
    | 'creator'
    | 'curator'
    | 'teacher'
    | 'collaborator'
    | 'commenter'
    | 'participant'
    | 'learner'
    | 'viewer';

/**
 * One stored document, exactly as it was read, plus how the creator is tied to
 * it.
 *
 * `data` is the raw document rather than a parsed one: an archive is only
 * useful if it is what the server actually holds, and a parse would silently
 * drop any field its schema doesn't know about. The relationship stays beside
 * the document rather than inside it, so an exported record still validates
 * against its own schema.
 */
export type Related = {
    id: string;
    data: unknown;
    relationships: Relationship[];
};

/** A kit and the versions published from it, which live in their own
 *  collection because a published version is immutable. */
export type RelatedKit = { kit: Related; versions: Related[] };

/** A collection that could not be read. The archive records it and carries on:
 *  a creator whose galleries happen to fail should still receive everything
 *  else, since all-or-nothing is the design that hands them nothing. */
export type Gap = { collection: CollectionStep; reason: string };

/** Something the archive could not represent faithfully, recorded so it is
 *  never a silent loss. */
export type Note = { file: string; reason: NoteReason };

/** Why a `.wp` file may not read back exactly, both named by
 *  `serializeExample`'s own documentation. The lossless `.json` beside it is
 *  what makes neither of these fatal. */
export type NoteReason = 'header-line' | 'single-grapheme-name';

/** The collections gathered, in the order they are read. Each is one step of
 *  the progress the creator hears. */
export const CollectionSteps = [
    'account',
    'projects',
    'galleries',
    'characters',
    'howtos',
    'chats',
    'kits',
    'classes',
    'feedback',
    'device',
] as const;
export type CollectionStep = (typeof CollectionSteps)[number];

/** Every step, including the two that follow the reads. */
export type ExportStep = CollectionStep | 'archive' | 'saving';

/** What the Firebase Auth record and the creator's token say about them. */
export type AccountFacts = {
    uid: string;
    /** Never an email address: an account that signs in with one is still shown
     *  their username, like everybody else (#628). */
    username: string;
    /** The creator's character, which is what every surface shows beside them. */
    character: string | null;
    /** Whether this account signs in with a username rather than an address. */
    usesUsername: boolean;
    emailVerified: boolean;
    providers: string[];
    created: string | null;
    lastSignIn: string | null;
    /** Custom claims held, as stored — never as implied. `admin` satisfies
     *  every `mod` and `teacher` test, but the archive reports what is on the
     *  account rather than what follows from it. */
    claims: string[];
};

/** State that exists on this device and in no cloud record, which the archive
 *  has to say plainly: exporting from a different browser silently omits it. */
export type DeviceState = {
    /** Every setting, tagged by whether it crosses devices. Only 15 of the 44
     *  are written to `creators/{uid}`. */
    settings: { key: string; device: boolean; value: unknown }[];
    /** Locale translation work in progress, which is never synced. */
    localizationEdits: unknown[];
    /** localStorage values that are not settings. */
    storage: Record<string, string>;
    /** Items with edits this device has not confirmed saved in the cloud. */
    unsaved: { domain: string; id: string }[];
};

/** Everything gathered, before it becomes an archive. */
export type AccountSnapshot = {
    /** ISO 8601, UTC. */
    exportedAt: string;
    account: AccountFacts;
    /** The server-written documents keyed by the creator's own uid. Each may be
     *  absent: a creator who has never been found to break a rule has no
     *  strikes document at all, which is the overwhelmingly common case. */
    self: {
        creator?: unknown;
        handle?: unknown;
        usage?: unknown;
        strikes?: unknown;
        notices?: unknown;
    };
    projects: Related[];
    galleries: Related[];
    characters: Related[];
    howTos: Related[];
    chats: Related[];
    classes: Related[];
    feedback: Related[];
    kits: RelatedKit[];
    device: DeviceState;
    gaps: Gap[];
};
