////////////////////////////////
// CACHE
////////////////////////////////

import { FirebaseError } from 'firebase/app';
import type { User } from 'firebase/auth';
import {
    and,
    collection,
    deleteDoc,
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
import { SvelteMap } from 'svelte/reactivity';
import { v4 as uuidv4 } from 'uuid';
import { SaveStatus, type Database } from '../Database';
import { firestore } from '../firebase';
import { CharacterSchema, type Character } from './Character';

const CharactersCollection = 'characters';

export class CharactersDatabase {
    private readonly db: Database;

    /**
     * This is a global reactive map that stores chats obtained from Firestore.
     * It's our locale cache.
     * null = we know it's not there.
     */
    readonly byID = $state<SvelteMap<string, Character | null>>(
        new SvelteMap(),
    );

    /** This is a cache of characters by name, mirroring the characters by id. We update it whenever we update the main store. */
    readonly byName = $state<SvelteMap<string, Character | null>>(
        new SvelteMap(),
    );

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
                or(
                    where('owner', '==', user.uid),
                    where('collaborators', 'array-contains', user.uid),
                ),
            ),
            async (snapshot) => {
                // First, go through the entire set, gathering the latest versions and remembering what project IDs we know
                // so we can delete ones that are gone from the server.
                snapshot.forEach((doc) => {
                    const character = doc.data();

                    // Try to parse the chat and save on success.
                    try {
                        const parsed = CharacterSchema.parse(character);

                        // If the character's update time is greater than the cached one, or there is no cached one, update.
                        // Update the chat in the local cache, but do not persist; we just got it from the DB.
                        const cached = this.byID.get(parsed.id);
                        if (
                            cached === undefined ||
                            cached === null ||
                            parsed.updated > cached.updated
                        ) {
                            this.updateCharacter(parsed, false);
                        }
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
                        this.byID.delete(characterID);
                        this.byName.delete(data.name);
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
    async createCharacter(
        character?: Character | undefined,
    ): Promise<string | undefined> {
        if (firestore === undefined) return;
        const user = this.db.getUser();
        if (user === null) return;

        // Make a new character.
        if (character === undefined)
            character = {
                id: uuidv4(),
                owner: user.uid,
                public: true,
                collaborators: [],
                updated: Date.now(),
                name: '',
                description: '',
                shapes: [],
            };
        else {
            character = {
                ...character,
                id: uuidv4(),
                owner: user.uid,
                // Make the name unique
                name: character.name + this.byID.size,
                updated: Date.now(),
            };
        }

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

    async copy(character: Character) {
        return this.createCharacter(character);
    }

    /** Update the local store's version of this character, and defer a save to the database later. */
    updateCharacter(character: Character, persist: boolean) {
        const existingCharacter = this.byID.get(character.id);

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
            this.byID.set(character.id, character);
            if (existingCharacter) this.byName.delete(existingCharacter.name);
            this.byName.set(character.name, character);
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
                Array.from(this.unsaved.values()).map((character) => {
                    if (firestore)
                        return setDoc(
                            doc(firestore, CharactersCollection, character.id),
                            character,
                        );
                    return undefined;
                }),
            );
            this.db.setStatus(SaveStatus.Saved, undefined);
        } catch (err) {
            this.db.setStatus(SaveStatus.Error, undefined);
            console.log(err);
        }
    }

    /** Get the character by ID
        @returns `undefined` if unable to check for it, `null`: it doesn't exist in the database, or the matching `Character`.
    **/
    async getByID(id: string): Promise<Character | null | undefined> {
        // Is it in the store by ID or name?
        const localMatchByID = this.byID.get(id);

        // Doesn't exist? Say so.
        if (localMatchByID === null) return null;
        // Found a match locally? Return it. Rely on realtime to keep it up to date.
        if (localMatchByID !== undefined) return localMatchByID;

        // We have to check, but don't have database access? Undefined.
        const user = this.db.getUser();
        if (firestore === undefined || user === null) return undefined;

        try {
            let match: Character | null = null;
            // Check the database by ID.
            const onlineMatchByID = await getDoc(
                doc(firestore, CharactersCollection, id),
            );
            if (onlineMatchByID.exists()) {
                const character = onlineMatchByID.data();
                try {
                    match = CharacterSchema.parse(character);
                } catch (err) {
                    // Couldn't parse, so there was a problem loading.
                    console.error(err);
                    return undefined;
                }
            }

            // Did we find one? Update the local store and return it.
            if (match) {
                this.updateCharacter(match, false);
                return match;
            } else {
                this.byID.set(id, null);
            }
            return null;
        } catch (err) {
            console.error(err);
            return null;
        }
    }

    /**
     * Get the character by name.
     @returns `undefined` if unable to check for it, `null`: it doesn't exist in the database, or the matching `Character`.
     * */
    async getByName(name: string): Promise<Character | null | undefined> {
        // Is it in the store by ID or name?
        const localMatchByName = this.byName.get(name);

        // Doesn't exist? Say so.
        if (localMatchByName === null) return null;
        // Found a match locally? Return it. Rely on realtime to keep it up to date.
        if (localMatchByName !== undefined) return localMatchByName;

        // We have to check, but don't have database access? Undefined.
        const user = this.db.getUser();
        if (firestore === undefined || user === null) return undefined;

        try {
            let match: Character | null = null;

            // Check the database by name.
            const onlineMatchByName = await getDocs(
                query(
                    collection(firestore, CharactersCollection),
                    and(
                        where('name', '==', name),
                        or(
                            where('public', '==', true),
                            where('owner', '==', user.uid),
                            where('collaborators', 'array-contains', user.uid),
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
                this.byName.set(name, null);
            }
            return null;
        } catch (err) {
            console.error(err);
            return undefined;
        }
    }

    /** Delete a character, if the owner */
    async deleteCharacter(id: string) {
        const user = this.db.getUser();
        if (user === null) return;
        const char = await this.getByID(id);
        if (char === null || char === undefined) return;
        if (user.uid === char.owner) {
            if (firestore === undefined) return;
            try {
                await deleteDoc(doc(firestore, CharactersCollection, id));
                this.byName.delete(char.name);
                this.byID.delete(char.id);
            } catch (err) {
                console.error(err);
                return;
            }
        }
    }

    /** Get all cached characters owned by the user */
    getEditableCharacters(): Character[] {
        const uid = this.db.getUser()?.uid;
        return Array.from(this.byID.values())
            .filter((character) => character !== null)
            .filter(
                (character) =>
                    character.owner === uid ||
                    (uid != undefined && character.collaborators.includes(uid)),
            );
    }

    /** Check if any owned characters have the given name */
    getEditableCharacterWithName(name: string): Character | undefined {
        return this.getEditableCharacters().find(
            (c) => c.name.split('/')[1] === name,
        );
    }

    /** Get all characters accessible by the user */
    getAvailableCharacters(): Character[] {
        const user = this.db.getUser();
        if (user === null) return [];
        return Array.from(this.byID.values())
            .filter((character) => character !== null)
            .filter(
                (character) =>
                    character.name !== '' &&
                    (character.owner === user.uid ||
                        character.public ||
                        character.collaborators.includes(user.uid)),
            );
    }
}
