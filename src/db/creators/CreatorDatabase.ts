import type { UserIdentifier } from 'firebase-admin/auth';
import type { User } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import type { Database } from '@db/Database';
import { functions } from '@db/firebase';
import isValidEmail from '@db/creators/isValidEmail';

export const CreatorCollection = 'creators';

/** The type for the record returned by our cloud functions */
type CreatorSchema = { uid: string; name: string | null; email: string | null };

/** Tracks metadata about creators, which is primarily stored in Firebase Auth, but also Firestore, where non-auth data about users lives. */
export class Creator {
    /** This is the domain we append to work around the lack of Firebase support for raw usernames. */
    static CreatorUsernameEmailDomain = '@u.wordplay.dev';
    readonly data: CreatorSchema;
    constructor(data: CreatorSchema) {
        this.data = data;
    }

    static from(user: User) {
        return new Creator({
            uid: user.uid,
            name: user.displayName,
            email: user.email,
        });
    }

    static usernameEmail(username: string) {
        return `${username}${Creator.CreatorUsernameEmailDomain}`;
    }

    static isUsername(email: string) {
        return email.endsWith(Creator.CreatorUsernameEmailDomain);
    }

    static getUsername(email: string) {
        return Creator.isUsername(email)
            ? email.replace(Creator.CreatorUsernameEmailDomain, '')
            : email;
    }

    getName() {
        return this.data.name;
    }

    getEmail() {
        return this.data.email;
    }

    isUsername() {
        return (
            this.data.email &&
            this.data.email.endsWith(Creator.CreatorUsernameEmailDomain)
        );
    }

    getUsername(anonymous: boolean) {
        return this.data.email === null
            ? '—'
            : anonymous
              ? `${this.data.email.split('@')[0].substring(0, 4)}...`
              : this.isUsername()
                ? this.data.email.replace(
                      Creator.CreatorUsernameEmailDomain,
                      '',
                  )
                : this.data.email;
    }

    getUID() {
        return this.data.uid;
    }
}

export default class CreatorDatabase {
    /** The main database that manages this gallery database */
    readonly database: Database;

    /** Resolved creators, keyed by the field we looked them up by. */
    private creatorsByEmail = new Map<string, Creator>();
    private creatorsByUID = new Map<string, Creator>();

    /** Lookups that came back empty — remembered so we don't keep
     *  paying for round-trips on dead IDs across a session. The cost
     *  of a stale miss (a user who signed up after we looked them up)
     *  is much smaller than the cost of N callable invocations per
     *  page render for the same nonexistent name. */
    private unknownEmails = new Set<string>();
    private unknownUIDs = new Set<string>();

    /** In-flight callable promises, keyed by ID. When several
     *  components render in the same tick — e.g. a grid of
     *  ProjectPreviews each calling getCreator(ownerUid) — they share
     *  one round-trip instead of each firing their own. Cleared once
     *  the request resolves. */
    private pendingByEmail = new Map<string, Promise<void>>();
    private pendingByUID = new Map<string, Promise<void>>();

    constructor(database: Database) {
        this.database = database;
    }

    static getUsernameEmail(username: string) {
        return Creator.usernameEmail(username);
    }

    async getCreators(
        ids: string[],
        detail: 'email' | 'uid',
    ): Promise<Creator[]> {
        const email = detail === 'email';
        const cache = email ? this.creatorsByEmail : this.creatorsByUID;
        const unknown = email ? this.unknownEmails : this.unknownUIDs;
        const pending = email ? this.pendingByEmail : this.pendingByUID;

        // Classify every id: already cached / known to not exist /
        // currently being fetched by a sibling call / genuinely new.
        const waits: Promise<void>[] = [];
        const missing: string[] = [];
        for (const id of ids) {
            if (cache.has(id) || unknown.has(id)) continue;
            const inFlight = pending.get(id);
            if (inFlight) waits.push(inFlight);
            else missing.push(id);
        }

        // Issue one callable for the genuinely-new ids. Stash the
        // shared promise under each id in `pending` so any caller
        // that lands while we're still in flight piggy-backs on us.
        if (missing.length > 0 && functions !== undefined) {
            const getCreatorsFn = httpsCallable<
                UserIdentifier[],
                CreatorSchema[]
            >(functions, 'getCreators');
            const request = getCreatorsFn(
                missing.map((id) => (email ? { email: id } : { uid: id })),
            )
                .then((res) => {
                    const schemas = res.data as CreatorSchema[];
                    const found = new Set<string>();
                    for (const schema of schemas) {
                        const creator = new Creator(schema);
                        if (schema.email)
                            this.creatorsByEmail.set(schema.email, creator);
                        this.creatorsByUID.set(schema.uid, creator);
                        found.add(
                            email ? (schema.email ?? '') : schema.uid,
                        );
                    }
                    // Mark anything we asked about and didn't get
                    // back as known-unknown so we don't ask again.
                    for (const id of missing)
                        if (!found.has(id)) unknown.add(id);
                })
                .finally(() => {
                    for (const id of missing) pending.delete(id);
                });
            for (const id of missing) pending.set(id, request);
            waits.push(request);
        }

        if (waits.length > 0) await Promise.all(waits);

        // Read the resolved creators from the cache in input order.
        // The cache is the authoritative result store: anything that
        // resolved during our wait — whether from our own request or
        // a sibling's — is now in there.
        const out: Creator[] = [];
        for (const id of ids) {
            const creator = cache.get(id);
            if (creator) out.push(creator);
        }
        return out;
    }

    async getCreatorsByUIDs(
        uids: string[],
    ): Promise<Record<string, Creator | null>> {
        // First get any missing creators.
        await this.getCreators(uids, 'uid');

        // Then construct a mapping
        const map: Record<string, Creator | null> = {};
        for (const uid of uids) map[uid] = this.creatorsByUID.get(uid) ?? null;
        return map;
    }

    async getUID(emailOrUsername: string): Promise<string | null> {
        // Append the username domain if it's not an email
        if (!isValidEmail(emailOrUsername))
            emailOrUsername =
                emailOrUsername + Creator.CreatorUsernameEmailDomain;
        // First get any missing creators.
        await this.getCreators([emailOrUsername], 'email');

        // Then return what we've got.
        return this.creatorsByEmail.get(emailOrUsername)?.getUID() ?? null;
    }

    async getCreator(uid: string): Promise<Creator | null> {
        await this.getCreators([uid], 'uid');
        return this.creatorsByUID.get(uid) ?? null;
    }
}
