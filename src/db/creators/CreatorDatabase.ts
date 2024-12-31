import { httpsCallable } from 'firebase/functions';
import type { Database } from './Database';
import { functions } from './firebase';
import type { UserIdentifier } from 'firebase-admin/auth';
import type { User } from 'firebase/auth';
import isValidEmail from './isValidEmail';

export const CreatorCollection = 'creators';

type CreatorSchema = {
    uid: string;
    name: string | null;
    email: string | null;
};

export class Creator {
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
    
    getProjectUsername(anonymous: boolean) {
        return this.data.email === null
            ? '—'
            : anonymous
              ? `${this.data.email.split('@')[0]}`
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
    readonly database: Database;
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

        if (missing.length === 0) return creators;
        if (functions === undefined) return creators;

        const getCreators = httpsCallable<UserIdentifier[], CreatorSchema[]>(
            functions,
            'getCreators',
        );

        const missingCreators = (
            await getCreators(
                missing.map((id) => (email ? { email: id } : { uid: id })),
            )
        ).data as CreatorSchema[];

        for (const schema of missingCreators) {
            const creator = new Creator(schema);
            if (schema.email) this.creatorsByEmail.set(schema.email, creator);
            this.creatorsByUID.set(schema.uid, creator);
            missing = missing.filter(
                (id) => id !== (email ? schema.email : schema.uid),
            );
            creators.push(creator);
        }

        for (const id of missing)
            (email ? this.unknownEmails : this.unknownUIDs).add(id);
        return creators;
    }

    async getCreatorsByUIDs(
        uids: string[],
    ): Promise<Record<string, Creator | null>> {
        await this.getCreators(uids, 'uid');
        const map: Record<string, Creator | null> = {};
        for (const uid of uids) map[uid] = this.creatorsByUID.get(uid) ?? null;
        return map;
    }

    async getUID(emailOrUsername: string): Promise<string | null> {
        if (!isValidEmail(emailOrUsername))
            emailOrUsername =
                emailOrUsername + Creator.CreatorUsernameEmailDomain;
        await this.getCreators([emailOrUsername], 'email');
        return this.creatorsByEmail.get(emailOrUsername)?.getUID() ?? null;
    }

    async getCreator(uid: string): Promise<Creator | null> {
        await this.getCreators([uid], 'uid');
        return this.creatorsByUID.get(uid) ?? null;
    }
}
