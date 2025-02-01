////////////////////////////////
// CACHE
////////////////////////////////

import { CharacterSchema, type Character } from '../characters/character';
import { SaveStatus, type Database } from './Database';
import {
    and,
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    or,
    query,
    setDoc,
    where,
    type Firestore,
    type Unsubscribe,
} from 'firebase/firestore';
import { firestore } from './firebase';
import type { User } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { v4 as uuidv4 } from 'uuid';

const CharactersCollection = 'characters';

export class CharactersDatabase {
    private readonly db: Database;

    /**
     * This is a global reactive map that stores chats obtained from Firestore.
     * It's our locale cache.
     * null = we know it's not there.
     */
    readonly byID = $state<Record<string, Character | null>>({});

    /** This is a cache of characters by name, mirroring the characters by id. We update it whenever we update the main store. */
    readonly byName = $state<Record<string, Character | null>>({});

    /** The realtime listener unsubscriber */
    private unsubscribe: Unsubscribe | undefined = undefined;

    /** The map of characters needing to be saved */
    private unsaved = new Map<string, Character>();

    /** The timeout we use to debounce saves */
    private saveTimeout: NodeJS.Timeout | undefined = undefined;

    constructor(db: Database) {
        this.db = db;
    }

    syncUser() {
        if (firestore === undefined) return;
        const user = this.db.getUser();
        if (user) this.listen(firestore, user);
    }

    private ignore() {
        if (this.unsubscribe) this.unsubscribe();
    }

    listen(firestore: Firestore, user: User) {
        this.ignore();
        this.unsubscribe = onSnapshot(
            query(
                collection(firestore, CharactersCollection),
                where('owner', '==', user.uid),
            ),
            async (snapshot) => {
                // First, go through the entire set, gathering the latest versions and remembering what project IDs we know
                // so we can delete ones that are gone from the server.
                snapshot.forEach((doc) => {
                    const character = doc.data();

                    // Try to parse the chat and save on success.
                    try {
                        const parsed = CharacterSchema.parse(character);
                        // Update the chat in the local cache, but do not persist; we just got it from the DB.
                        this.updateCharacter(parsed, false);
                    } catch (error) {
                        // If the chat doesn't succeed, then we don't save it.
                        console.error(error);
                    }
                });

                // Next, go through the changes and see if any were explicitly removed, and if so, delete them.
                snapshot.docChanges().forEach((change) => {
                    // Removed? Delete the local cache of the project.
                    // Stop litening to the project's changes.
                    if (change.type === 'removed') {
                        const characterID = change.doc.id;
                        const data = change.doc.data();
                        delete this.byID[characterID];
                        delete this.byName[data.name];
                    }
                });
            },
            (error) => {
                if (error instanceof FirebaseError) {
                    console.error(error.code);
                    console.error(error.message);
                }
            },
        );
    }

    /** Create a character */
    async createCharacter(): Promise<string | undefined> {
        if (firestore === undefined) return;
        const user = this.db.getUser();
        if (user === null) return;

        // Make a new character.
        const character: Character = {
            id: uuidv4(),
            owner: user.uid,
            public: false,
            viewers: [],
            projects: [],
            updated: Date.now(),
            name: '',
            description: '',
            shapes: [],
        };

        try {
            await setDoc(
                doc(firestore, CharactersCollection, character.id),
                character,
            );
        } catch (err) {
            console.error(err);
            return;
        }

        // Cache locally.
        this.updateCharacter(character, false);

        // Return the id to confirm we created it.
        return character.id;
    }

    /** Update the local store's version of this character, and defer a save to the database later. */
    updateCharacter(character: Character, persist: boolean) {
        const existingCharacter = this.byID[character.id];

        // Are they equivalent? Don't bother. This prevents cycles.
        if (
            existingCharacter &&
            JSON.stringify(existingCharacter) === JSON.stringify(character)
        )
            return;

        if (
            existingCharacter === undefined ||
            existingCharacter === null ||
            character.updated > existingCharacter.updated
        ) {
            const newCharacter = { ...character, updated: Date.now() };
            this.byID[character.id] = newCharacter;
            if (existingCharacter) delete this.byName[existingCharacter.name];
            this.byName[character.name] = newCharacter;
        }

        // Are we to persist? Defer a save.
        if (persist) {
            this.unsaved.set(character.id, character);
            if (this.saveTimeout) clearTimeout(this.saveTimeout);
            this.saveTimeout = setTimeout(
                () => this.persistUnsavedCharacters(),
                1000,
            );
        }
    }

    async persistUnsavedCharacters() {
        this.db.setStatus(SaveStatus.Saving, undefined);
        if (firestore === undefined) return;
        try {
            await Promise.all(
                this.unsaved
                    .values()
                    .map(
                        (character) =>
                            firestore &&
                            setDoc(
                                doc(
                                    firestore,
                                    CharactersCollection,
                                    character.id,
                                ),
                                character,
                            ),
                    ),
            );
            this.db.setStatus(SaveStatus.Saved, undefined);
        } catch (err) {
            this.db.setStatus(SaveStatus.Error, undefined);
            console.log(err);
        }
    }

    /**
     * Get the character by ID or name.
     @returns `undefined` if unable to check for it, `null`: it doesn't exist in the database, or the matching `Character`.
     * */
    async getByIDOrName(
        idOrName: string,
    ): Promise<Character | null | undefined> {
        // Is it in the store by ID or name?
        const localMatchByID = this.byID[idOrName];
        const localMatchByName = this.byName[idOrName];

        // Doesn't exist? Say so.
        if (localMatchByID === null && localMatchByName === null) return null;
        // Found a match locally? Return it. Rely on realtime to keep it up to date.
        if (localMatchByID !== undefined) return localMatchByID;
        if (localMatchByName !== undefined) return localMatchByName;

        // We have to check, but don't have database access? Undefined.
        const user = this.db.getUser();
        if (firestore === undefined || user === null) return undefined;

        try {
            let match: Character | null = null;
            // Check the database by ID.
            const onlineMatchByID = await getDoc(
                doc(firestore, CharactersCollection, idOrName),
            );
            if (onlineMatchByID.exists()) {
                const character = onlineMatchByID.data();
                try {
                    match = CharacterSchema.parse(character);
                } catch (err) {
                    // Couldn't parse, so don't save it.
                    console.error(err);
                    return null;
                }
            }

            // Check the database by name.
            const onlineMatchByName = await getDocs(
                query(
                    collection(firestore, CharactersCollection),
                    and(
                        where('name', '==', idOrName),
                        or(
                            where('public', '==', true),
                            where('owner', '==', user.uid),
                            where('viewers', 'array-contains', user.uid),
                        ),
                    ),
                ),
            );
            onlineMatchByName.forEach((doc) => {
                if (doc.exists()) {
                    const character = doc.data();
                    try {
                        match = CharacterSchema.parse(character);
                    } catch (err) {
                        // Couldn't parse, so don't save it.
                        console.error(err);
                        return null;
                    }
                }
            });

            // Did we find one? Update the local store and return it.
            if (match) {
                this.updateCharacter(match, false);
                return match;
            } else {
                this.byID[idOrName] = null;
                this.byName[idOrName] = null;
            }
            return null;
        } catch (err) {
            console.error(err);
            return undefined;
        }
    }

    /** Get all cached characters owned by the user */
    getOwnedCharacters(): Character[] {
        return Array.from(Object.values(this.byID))
            .filter((character) => character !== null)
            .filter((character) => character.owner === this.db.getUser()?.uid);
    }

    /** Get all characters accessible by the user */
    getAvailableCharacters(): Character[] {
        const user = this.db.getUser();
        if (user === null) return [];
        return Array.from(Object.values(this.byID))
            .filter((character) => character !== null)
            .filter(
                (character) =>
                    character.name !== '' &&
                    (character.owner === user.uid ||
                        character.public ||
                        character.viewers.includes(user.uid)),
            );
    }
}
