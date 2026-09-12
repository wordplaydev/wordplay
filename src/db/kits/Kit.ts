import { z } from 'zod';
import {
    ModerationStateSchema,
    unknownFlags,
    type ModerationState,
} from '@db/projects/Moderation';
import { PreviewContentSchema } from '@db/projects/ProjectSchemas';

/**
 * A **kit** is one source a creator has published for other people to build with (#8).
 *
 * Two documents, and the split is what makes this cheap: `kits/{id}` is small and mutable,
 * while `kitversions/{id}_{n}` is the code and is immutable, so a client caches a version
 * forever and the rules admitting it need no `get()`. Field names match what
 * `describeSubject` reads, so moderation costs a line rather than a branch.
 */
const KitSchemaV1 = z.object({
    /** Version of this schema. */
    v: z.literal(1),
    /** A UUID, so a rename never changes what a stored dependency points at. */
    id: z.string().uuid(),
    /** The uid who published it. Only they may publish a new version. */
    owner: z.string(),
    /**
     * The full `username/name`, which is what a borrow writes after `@`.
     *
     * Owner-scoped for the reason characters are: two creators may both call something
     * `colors` and collide with nothing, while one creator doing so would make
     * `@them/colors` resolve to whichever document a query happened to return last.
     */
    name: z.string(),
    /**
     * Full names this kit used to have, kept when its owner renames.
     *
     * A `↓ @amy/colors` sits in other people's source, which we have no business
     * rewriting — most of a kit's users are not its author. So an old name keeps
     * resolving instead. The same bargain characters make.
     */
    aliases: z.array(z.string()),
    /** Always empty today. Declared so `describeSubject` can read it unconditionally. */
    collaborators: z.array(z.string()),
    /** What the kit is for, in the author's own words. Searched via `words`. */
    description: z.string(),
    /** The newest version's rendered `⭐` example, denormalized for the same reason
     *  `description` and `exports` are: a page of registry tiles is one query, and
     *  reading a version per tile to draw a glyph would make it twenty-six. */
    preview: PreviewContentSchema.exactOptional(),
    /** The highest version that currently exists, and what a version-less borrow is
     *  repaired to. Goes *down* when the newest version is withdrawn. */
    latest: z.number(),
    /**
     * How many versions have ever been published — a high-water mark, never decremented,
     * which bounds how many version documents can exist so a takedown stays one batch.
     *
     * It is also what the next publish numbers from: a version is cached in IndexedDB
     * permanently, so numbering from `latest` would reissue a withdrawn number and serve
     * two different programs under one id, depending on who had the old one cached.
     */
    versionCount: z.number(),
    /**
     * Whether this kit is *discoverable*.
     *
     * Not the same question as whether a borrow of it resolves — that is the version's own
     * `public`. Unpublishing a kit stops new people finding it without breaking the
     * programs that already use it; only a moderation decision takes the versions down.
     */
    public: z.boolean(),
    /**
     * Where this kit's *newest* version stands with the moderators, in galleries'
     * vocabulary. The moderator queue's filter, and not the registry's — see
     * {@link SerializedKit.listed}.
     */
    moderation: z.enum(['unrequested', 'pending', 'approved', 'denied']),
    /** When that last changed, so a second decision reads as new. */
    moderatedAt: z.number().nullable(),
    /**
     * Whether the registry lists this kit, and which version it lists.
     *
     * Separate from `moderation` because approval is of a **version**, not of a kit: a
     * creator who publishes v2 of a listed kit should not lose the listing v1 earned while
     * v2 waits its turn. So `moderation` goes back to `pending` and these two stay put,
     * which is what keeps the kit findable and the new version queued at the same time.
     *
     * What readers are offered is `listedVersion`, never `latest` — otherwise the tile's
     * borrow line would hand them the version nobody has reviewed. A change to what the
     * *kit* claims about itself (its name, description, exports or kinds) does clear these,
     * since the registry shows those live.
     *
     * A boolean beside the number rather than `listedVersion !== null` alone, because the
     * registry query pairs it with an `orderBy` and Firestore will not take an inequality
     * there.
     *
     * `.default(...)` on both for the reason v8's `crdt`, v9's `remixOf` and v10's pair
     * have one: `upgradeKit` only backfills a document *below* the latest version, so a
     * kit that reached storage already claiming v1 without these would fail validation on
     * every read forever — silently, since every caller drops what it cannot parse. That
     * is not hypothetical: it is what hid a pending kit from the moderator queue.
     */
    listed: z.boolean().default(false),
    listedVersion: z.number().nullable().default(null),
    /** Which rules a denial found broken. */
    flags: ModerationStateSchema,
    /**
     * Folded, deduplicated words from the name, description, and export names, maintained
     * server-side by the `kitEdited` trigger. The registry's search index.
     */
    words: z.array(z.string()),
    /**
     * The preferred name of each `↑` export.
     *
     * Denormalized onto the kit as well as the version because `kitEdited` folds it into
     * `words` — someone looking for a `fade` wants the kit that shares one, not one that
     * happens to be called "colors". It read this field off the kit for a while when only
     * the version carried it, so no export name ever reached the index.
     */
    exports: z.array(z.string()),
    /**
     * The concept ids of the types this kit's exports carry — `Color`, `Phrase`, `Number`.
     * Ids and never names, because a name is locale text and a query is not: the same kit
     * must be findable under "color" by a reader browsing in Marathi.
     *
     * The only index on a kit a client writes, because `functions/` cannot reach the
     * parser and a type is unreadable without one. Affordable where `words` would not be:
     * the vocabulary is closed, and `kitEdited` sends any change to it back to `pending`.
     */
    kinds: z.array(z.string()),
    /**
     * When this kit last changed in a way the registry orders by: a publish, a withdrawal,
     * or a request to be listed.
     *
     * Deliberately *not* a rename. A rename changes `name`, which `kitEdited` already
     * treats as a content change, so the kit leaves the listing until it is approved again
     * — and bumping this would reshuffle the whole registry because one creator renamed.
     */
    updated: z.number(),
    /** The project a version was last published from, so "publish again" knows where. */
    originProject: z.string().nullable(),
});

const KitSchemaLatestVersion = 1;
const KitSchema = KitSchemaV1;

export type SerializedKit = z.infer<typeof KitSchema>;
type KitUnknownVersion = SerializedKit;

export function upgradeKit(kit: KitUnknownVersion): SerializedKit {
    switch (kit.v) {
        case KitSchemaLatestVersion:
            return kit;
        default:
            throw new Error('Unexpected kit version');
    }
}

/**
 * One published version of a kit: immutable, and the only thing a borrow reads.
 *
 * `public` is denormalized onto it rather than read through to the kit, because that is
 * exactly what lets the read rule be a field test with no `get()` — which is what keeps
 * version reads off the rules' 10-document budget and lets 30 of them be fetched at once.
 */
const KitVersionSchemaV1 = z.object({
    v: z.literal(1),
    /** `${kit}_${version}`. Not a `#`, which would become a URL fragment. */
    id: z.string(),
    /** The kit this belongs to. */
    kit: z.string(),
    /** Which version. Starts at 1 and only ever increases. */
    version: z.number(),
    /** Denormalized from the kit, so the read rule needs no document access. */
    owner: z.string(),
    /** The kit's full name *at publish time*, for display without a second read. */
    name: z.string(),
    /** Whether a borrow may read this. Server-written; only moderation clears it. */
    public: z.boolean(),
    /**
     * The source's `NAMES` in Wordplay syntax, e.g. `colors/en`.
     *
     * Kept rather than derived from the kit's name, because a source's name carries the
     * locale tags that say what language the kit is written in.
     */
    sourceName: z.string(),
    /** The source itself. */
    code: z.string(),
    /** The locales the source declares. */
    locales: z.array(z.string()),
    /**
     * The preferred name of each `↑` export, denormalized so the registry can list what a
     * kit offers without parsing it.
     */
    exports: z.array(z.string()),
    /** The rendered `⭐` example, so browsing the registry evaluates nothing. */
    preview: PreviewContentSchema.exactOptional(),
    /** Unix time of publication. */
    created: z.number(),
});

export const KitVersionSchemaLatestVersion = 1;
const KitVersionSchema = KitVersionSchemaV1;

export type SerializedKitVersion = z.infer<typeof KitVersionSchema>;

export { KitSchema, KitVersionSchema };

/** The id of one version's document. */
export function kitVersionID(kit: string, version: number): string {
    return `${kit}_${version}`;
}

/**
 * How many versions one kit may have.
 *
 * A cap exists so the moderation takedown — which flips `public` on every version — stays
 * one bounded batch. 100 is a guess until there is usage.
 */
export const MAX_KIT_VERSIONS = 100;

/** A brand new kit, at the values `kitServerFieldsInitial()` in firestore.rules requires. */
export function makeKit(
    id: string,
    owner: string,
    name: string,
    description: string,
    originProject: string | null,
): SerializedKit {
    return {
        v: KitSchemaLatestVersion,
        id,
        owner,
        name,
        aliases: [],
        collaborators: [],
        description,
        latest: 0,
        versionCount: 0,
        public: false,
        // Never `approved` on arrival: the guard that keeps a kit out of the public
        // listing compares against what is stored, and on a create there is nothing
        // stored — which is how an already-approved gallery once walked straight into
        // the listing with no moderator seeing it (#1352).
        moderation: 'unrequested',
        moderatedAt: null,
        // Never listed on arrival, for the reason `moderation` is never `approved`: the
        // create guard has nothing stored to compare against, so every rule it states has
        // to be stated as a value (#1352).
        listed: false,
        listedVersion: null,
        flags: unknownFlags(),
        words: [],
        exports: [],
        kinds: [],
        updated: Date.now(),
        originProject,
    };
}

export type { ModerationState };

/**
 * The kit a project is publishing a new version *of*, if any.
 *
 * By **id**, never by name: a name lookup meant the first publish after a rename matched
 * nothing and silently created a *second* kit. Ownership is re-checked rather than
 * trusted, because a remix carries its origin's code but is not its origin's kit.
 */
export function findPublishTarget(
    kits: ReadonlyMap<string, SerializedKit | null>,
    kitID: string | null,
    uid: string,
): SerializedKit | undefined {
    if (kitID === null) return undefined;
    const known = kits.get(kitID);
    return known !== null && known !== undefined && known.owner === uid
        ? known
        : undefined;
}

/**
 * The number the next published version of a kit takes, from `versionCount` and never
 * from `latest`: the two differ once a version is withdrawn, and numbering from `latest`
 * would reissue a published number. See {@link SerializedKit.versionCount}.
 */
export function nextVersion(kit: SerializedKit | undefined): number {
    return (kit?.versionCount ?? 0) + 1;
}

/**
 * Whether a kit's newest version may still be withdrawn: only while it has never been
 * listed, so nobody could have found it to borrow. Nothing records who borrows a kit — a
 * borrow lives in source code nobody indexes — so that is the only safe answer available.
 *
 * `moderation` is the signal rather than `public` because `kitEdited` moves it off
 * `unrequested` the moment a kit is listed, and no client write of it is admitted, so
 * unlisting cannot reset it.
 */
export function isWithdrawable(kit: SerializedKit): boolean {
    return kit.moderation === 'unrequested' && kit.latest >= 1;
}
