import { httpsCallable } from 'firebase/functions';
import type { Database } from './Database';
import { functions } from './firebase';
import type { UserIdentifier } from 'firebase-admin/auth';
import type { User } from 'firebase/auth';
import isValidEmail from './isValidEmail';

export const CreatorCollection = 'creators';

/** The type for the record returned by our cloud functions */
type CreatorSchema = {
    uid: string;
    name: string | null;
    email: string | null;
};

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

    /** A cache of creator data from Firebase auth */
    private creatorsByEmail = new Map<string, Creator>();
    private creatorsByUID = new Map<string, Creator>();

    private unknownEmails = new Set<string>();
    private unknownUIDs = new Set<string>();

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
        let missing = ids.slice();
        const creators: Creator[] = [];
        for (const id of ids) {
            const creator = (
                email ? this.creatorsByEmail : this.creatorsByUID
            ).get(id);
            if (creator) creators.push(creator);
            else missing.push(id);
        }

        // Found them all? Return the list.
        if (missing.length === 0) return creators;

        // No access to database? Return what we've got.
        if (functions === undefined) return creators;

        // Get missing info.
        const getCreators = httpsCallable<UserIdentifier[], CreatorSchema[]>(
            functions,
            'getCreators',
        );

        const missingCreators = (
            await getCreators(
                missing.map((id) => (email ? { email: id } : { uid: id })),
            )
        ).data as CreatorSchema[];

        // Add the missing creators
        for (const schema of missingCreators) {
            const creator = new Creator(schema);
            if (schema.email) this.creatorsByEmail.set(schema.email, creator);
            this.creatorsByUID.set(schema.uid, creator);
            missing = missing.filter(
                (id) => id !== (email ? schema.email : schema.uid),
            );
            creators.push(creator);
        }

        // Remember the emails we didn't find users for.
        for (const id of missing)
            (email ? this.unknownEmails : this.unknownUIDs).add(id);

        // Return the final list of creators.
        return creators;
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
