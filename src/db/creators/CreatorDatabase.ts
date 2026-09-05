import type { UserIdentifier } from 'firebase-admin/auth';
import type { User } from 'firebase/auth';
import type { Database } from '@db/Database';
import { getFunctionsInstance } from '@db/firebase';
import type { FindCreatorInputs, FindCreatorOutput } from 'shared-types';

export const CreatorCollection = 'creators';

/**
 * The type for the record returned by our cloud functions.
 *
 * Deliberately carries no email address (#628). It used to, and
 * `getUsername(false)` returned it verbatim — so an account with a real address
 * had it rendered on the nav chip, every project tile, chat, carets, and every
 * roster. `getCreators` still *sends* one for a release, because deploy.yml
 * ships functions and hosting together with no ordering guarantee; nothing
 * here reads it.
 */
type CreatorSchema = {
    uid: string;
    name: string | null;
    username: string | null;
};

/** Tracks metadata about creators, which is primarily stored in Firebase Auth, but also Firestore, where non-auth data about users lives. */
export class Creator {
    /** This is the domain we append to work around the lack of Firebase support for raw usernames. */
    static CreatorUsernameEmailDomain = '@u.wordplay.dev';
    readonly data: CreatorSchema;
    constructor(data: CreatorSchema) {
        this.data = data;
    }

    /** The signed-in creator. `username` comes from their handle when they have
     *  one, and otherwise from their synthesized address — which is where a
     *  username lived before handles existed, and is why no account has to be
     *  migrated. */
    static from(user: User, username?: string) {
        return new Creator({
            uid: user.uid,
            name: user.displayName,
            username: username ?? Creator.getUsername(user.email ?? '') ?? null,
        });
    }

    static usernameEmail(username: string) {
        return `${username}${Creator.CreatorUsernameEmailDomain}`;
    }

    static isUsername(email: string) {
        return email.endsWith(Creator.CreatorUsernameEmailDomain);
    }

    /** The username inside a synthesized address, or undefined when the address
     *  is a real one. Undefined rather than the address itself: returning the
     *  address is exactly the bug #628 fixes. */
    static getUsername(email: string): string | undefined {
        return Creator.isUsername(email)
            ? email.replace(Creator.CreatorUsernameEmailDomain, '')
            : undefined;
    }

    getName() {
        return this.data.name;
    }

    /** What every surface shows. Never an email address: a creator who signs in
     *  with one is still shown their username, like everybody else. */
    getUsername(anonymous: boolean) {
        const username = this.data.username;
        if (username === null) return '—';
        return anonymous ? `${[...username].slice(0, 4).join('')}…` : username;
    }

    getUID() {
        return this.data.uid;
    }
}

export default class CreatorDatabase {
    /** The main database that manages this gallery database */
    readonly database: Database;

    /** Resolved creators, keyed by uid.
     *
     *  There used to be a second cache keyed by email, for looking someone up
     *  by address. That direction now goes through the `findCreator` callable,
     *  which answers a uid and nothing else — so an address can still be used
     *  to *find* someone, but can never be read back out. */
    private creatorsByUID = new Map<string, Creator>();

    /** Lookups that came back empty — remembered so we don't keep
     *  paying for round-trips on dead IDs across a session. The cost
     *  of a stale miss (a user who signed up after we looked them up)
     *  is much smaller than the cost of N callable invocations per
     *  page render for the same nonexistent name. */
    private unknownUIDs = new Set<string>();

    /** In-flight callable promises, keyed by uid. When several
     *  components render in the same tick — e.g. a grid of
     *  ProjectPreviews each calling getCreator(ownerUid) — they share
     *  one round-trip instead of each firing their own. Cleared once
     *  the request resolves. */
    private pendingByUID = new Map<string, Promise<void>>();

    constructor(database: Database) {
        this.database = database;
    }

    static getUsernameEmail(username: string) {
        return Creator.usernameEmail(username);
    }

    async getCreators(uids: string[]): Promise<Creator[]> {
        // Classify every id: already cached / known to not exist /
        // currently being fetched by a sibling call / genuinely new.
        const waits: Promise<void>[] = [];
        const missing: string[] = [];
        for (const id of uids) {
            if (this.creatorsByUID.has(id) || this.unknownUIDs.has(id))
                continue;
            const inFlight = this.pendingByUID.get(id);
            if (inFlight) waits.push(inFlight);
            else missing.push(id);
        }

        // Issue one callable for the genuinely-new ids. Stash the
        // shared promise under each id in `pending` so any caller
        // that lands while we're still in flight piggy-backs on us.
        const functions =
            missing.length > 0 ? await getFunctionsInstance() : undefined;
        if (functions !== undefined) {
            const { httpsCallable } = await import('firebase/functions');
            const getCreatorsFn = httpsCallable<
                UserIdentifier[],
                CreatorSchema[]
            >(functions, 'getCreators');
            const request = getCreatorsFn(missing.map((uid) => ({ uid })))
                .then((res) => {
                    const schemas = res.data as CreatorSchema[];
                    const found = new Set<string>();
                    for (const schema of schemas) {
                        this.creatorsByUID.set(
                            schema.uid,
                            new Creator({
                                uid: schema.uid,
                                name: schema.name,
                                username: schema.username ?? null,
                            }),
                        );
                        found.add(schema.uid);
                    }
                    // Mark anything we asked about and didn't get
                    // back as known-unknown so we don't ask again.
                    for (const id of missing)
                        if (!found.has(id)) this.unknownUIDs.add(id);
                })
                .finally(() => {
                    for (const id of missing) this.pendingByUID.delete(id);
                });
            for (const id of missing) this.pendingByUID.set(id, request);
            waits.push(request);
        }

        if (waits.length > 0) await Promise.all(waits);

        // Read the resolved creators from the cache in input order.
        // The cache is the authoritative result store: anything that
        // resolved during our wait — whether from our own request or
        // a sibling's — is now in there.
        const out: Creator[] = [];
        for (const id of uids) {
            const creator = this.creatorsByUID.get(id);
            if (creator) out.push(creator);
        }
        return out;
    }

    async getCreatorsByUIDs(
        uids: string[],
    ): Promise<Record<string, Creator | null>> {
        // First get any missing creators.
        await this.getCreators(uids);

        // Then construct a mapping
        const map: Record<string, Creator | null> = {};
        for (const uid of uids) map[uid] = this.creatorsByUID.get(uid) ?? null;
        return map;
    }

    /**
     * Resolve an email address or a username to a uid, for adding someone to a
     * gallery, a class, or a project.
     *
     * Goes through the `findCreator` callable rather than looking the address
     * up here, because that callable requires a signed-in caller and returns a
     * uid alone. Looking someone up by address stays possible; reading an
     * address back does not.
     */
    async getUID(emailOrUsername: string): Promise<string | null> {
        const functions = await getFunctionsInstance();
        if (functions === undefined) return null;
        const { httpsCallable } = await import('firebase/functions');
        const find = httpsCallable<FindCreatorInputs, FindCreatorOutput>(
            functions,
            'findCreator',
        );
        try {
            const { data } = await find({ emailOrUsername });
            return data.uid;
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    async getCreator(uid: string): Promise<Creator | null> {
        await this.getCreators([uid]);
        return this.creatorsByUID.get(uid) ?? null;
    }
}
