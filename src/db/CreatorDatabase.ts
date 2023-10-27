import { httpsCallable } from 'firebase/functions';
import type { Database } from './Database';
import { functions } from './firebase';
import type { UserIdentifier } from 'firebase-admin/auth';

export const CreatorCollection = 'creators';

/** The type for a record returned by our cloud functions */
type CreatorSchemaV1 = {
    /** A version of the creator record */
    v: 1;
    uid: string;
    name: string | null;
    email: string | null;
};

export type Creator = CreatorSchemaV1;

type CreatorSchemaUnknownVersion = CreatorSchemaV1;

/** Upgrades old versions of the creator schema. */
export function upgradeCreator(creator: CreatorSchemaUnknownVersion): Creator {
    switch (creator.v) {
        case 1:
            return creator;
        default:
            throw new Error(
                `Unknown creator schema version ${creator.v}`
            ) as never;
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

    async getCreators(
        ids: string[],
        detail: 'email' | 'uid'
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
        const getCreators = httpsCallable<UserIdentifier[], Creator[]>(
            functions,
            'getCreators'
        );

        const missingCreators = (
            await getCreators(
                missing.map((id) => (email ? { email: id } : { uid: id }))
            )
        ).data as Creator[];

        // Add the missing creators
        for (const creator of missingCreators) {
            if (creator.email) this.creatorsByEmail.set(creator.email, creator);
            this.creatorsByUID.set(creator.uid, creator);
            missing = missing.filter(
                (id) => id !== (email ? creator.email : creator.uid)
            );
            creators.push(creator);
        }

        // Remember the emails we didn't find users for.
        for (const id of missing)
            (email ? this.unknownEmails : this.unknownUIDs).add(id);

        // Return the final list of creators.
        return creators;
    }

    async getCreatorsByEmail(
        uids: string[]
    ): Promise<Record<string, Creator | null>> {
        // First get any missing creators.
        await this.getCreators(uids, 'uid');

        // Then construct a mapping
        const map: Record<string, Creator | null> = {};
        for (const uid of uids) map[uid] = this.creatorsByUID.get(uid) ?? null;
        return map;
    }

    async getUID(email: string): Promise<string | null> {
        // First get any missing creators.
        await this.getCreators([email], 'email');

        // Then return what we've got.
        return this.creatorsByEmail.get(email)?.uid ?? null;
    }

    async getCreator(uid: string): Promise<Creator | null> {
        await this.getCreators([uid], 'uid');
        return this.creatorsByUID.get(uid) ?? null;
    }
}
