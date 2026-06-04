////////////////////////////////
// CACHE
////////////////////////////////

import { CharacterSchema, type Character } from '@db/characters/Character';
import {
    SaveStatus,
    type Database,
    type SaveCounts,
    type SaveError,
} from '@db/Database';
import { Domain } from '@db/Domains';
import { firestore } from '@db/firebase';
import isQuotaError from '@db/isQuotaError';
import type Project from '@db/projects/Project';
import SaveTracker from '@db/SaveTracker.svelte';
import supportsIndexedDB from '@db/supportsIndexedDB';
import ConceptLink, { CharacterName } from '@nodes/ConceptLink';
import type Node from '@nodes/Node';
import deferToIdle from '@util/deferToIdle';
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

const CharactersCollection = Domain.Characters;

/**
 * Cap on a character name
 */
export const MAX_CHARACTER_NAME_LENGTH = 32;

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

    /** Cancels a pending idle-deferred `listen()` (see `listen`/`ignore`). */
    private listenDefer: (() => void) | undefined = undefined;

    /** The map of characters needing to be saved */
    private unsaved = new Map<string, Character>();

    /** The timeout we use to debounce saves */
    private saveTimeout: NodeJS.Timeout | undefined = undefined;

    /** Whether this is a browser with IndexedDB support. */
    readonly IndexedDBSupported = supportsIndexedDB();

    /** Flips true once the in-memory indexes have been populated from the
     *  local cache (or immediately, when there's no IndexedDB). Pages can gate
     *  on this rather than on the cloud listener. */
    hydrated: boolean = $state(false);

    /** Per-item cloud-save tracking (unsaved set, errors, counts, durable dirty
     *  rows), shared with the other domain facades. See {@link SaveTracker}. */
    private readonly saves = new SaveTracker({
        domain: Domain.Characters,
        localDB: () => this.db.localDB,
        track: (write) => this.db.track(write),
        deviceCount: () => this.getEditableCharacters().length,
        supported: () => this.IndexedDBSupported,
        isHydrated: () => this.hydrated,
        onStorageFull: () =>
            this.db.reportBanner((l) => l.ui.banner.storageFull),
    });

    /** IDs of the user's characters whose latest local edit hasn't been
     *  confirmed saved in the cloud (write pending or failed). */
    get unsavedIDs() {
        return this.saves.unsavedIDs;
    }

    /** Save failures for the save-status dialog. */
    get saveErrors(): SaveError[] {
        return this.saves.saveErrors;
    }

    /** How many of the user's characters are saved on this device, in the
     *  cloud, and unsaved, for the save-status dialog. */
    get saveCounts(): SaveCounts {
        return this.saves.saveCounts;
    }

    constructor(db: Database) {
        this.db = db;

        // Warm the in-memory indexes from the local cache before any cloud
        // sync, so characters are available offline / on cold start.
        this.hydrate();
    }

    /** Wrap a cloud write so the save-status dialog reflects it; see
     *  {@link SaveTracker.trackSave}. */
    private trackSave(
        id: string,
        name: string | undefined,
        write: Promise<unknown>,
    ): Promise<boolean> {
        return this.saves.trackSave(id, name, write);
    }

    /** Re-attempt the cloud write for every character still marked unsaved
     *  (e.g. edits made offline before a reload). Called once the user is known
     *  (startSync) and on reconnect. A no-op when nothing is unsaved. */
    async flushUnsaved() {
        if (firestore === undefined) return;
        const db = firestore;
        await this.saves.flushUnsaved((id) => {
            const character = this.byID.get(id);
            return character
                ? {
                      name: character.name,
                      write: setDoc(
                          doc(db, CharactersCollection, id),
                          character,
                      ),
                  }
                : undefined;
        });
    }

    /** Populate the in-memory indexes from the shared local cache, then keep
     *  them in sync with local writes (including cross-tab). The first emission
     *  flips `hydrated`. */
    async hydrate() {
        if (!this.IndexedDBSupported) {
            this.hydrated = true;
            return;
        }
        // Seed the in-memory unsaved set from the durable dirty table BEFORE the
        // cloud listener can run, so the listener's skip-dirty guard preserves
        // local edits that haven't reached the cloud yet.
        await this.saves.seedDirty();
        let firstEmission = true;
        this.db.localDB.getAllCharacters().subscribe((characters) => {
            for (const character of characters)
                this.loadCharacterIntoMemory(character);
            if (firstEmission) {
                firstEmission = false;
                this.hydrated = true;
            }
        });
    }

    /** Insert a character read from the local cache into the in-memory indexes,
     *  without persisting or running update side-effects. Skips characters the
     *  in-memory copy already holds at an equal-or-newer version, so a stale
     *  cache read can't clobber a fresh in-memory edit. Never writes back to
     *  the cache, so the hydrate subscription can't loop. */
    private loadCharacterIntoMemory(character: Character) {
        const existing = this.byID.get(character.id);
        if (existing && existing.updated >= character.updated) return;
        if (existing) this.byName.delete(existing.name);
        this.byID.set(character.id, character);
        this.byName.set(character.name, character);
    }

    /** Mirror authoritative character data (cloud snapshots, local edits) into
     *  the local cache for cold-start hydration. Never called from the hydrate
     *  path, to avoid a write/emit loop. */
    private async cacheCharactersLocally(characters: Character[]) {
        if (!this.IndexedDBSupported || characters.length === 0) return;
        try {
            // Await so a rejected write (e.g. full storage) is caught. This
            // mirrors cloud data, so a failure here isn't data loss — surface a
            // transient banner rather than the persistent save-status error.
            await this.db.localDB.saveCharacters(characters);
        } catch (error) {
            if (isQuotaError(error))
                this.db.reportBanner((l) => l.ui.banner.storageFull, error);
            else console.error(error);
        }
    }

    /** Clear the local character cache and in-memory indexes. Used when a
     *  different account takes over this device (privacy) and on explicit
     *  sign-out, mirroring Projects' local wipe. */
    async clearLocal() {
        this.byID.clear();
        this.byName.clear();
        this.unsaved.clear();
        await this.saves.clearTracking();
        if (this.IndexedDBSupported)
            await this.db.localDB.deleteAllCharacters();
    }

    syncUser() {
        if (firestore === undefined) return;
        const user = this.db.getUser();
        // Tear the listener down on logout — otherwise it keeps running after
        // auth clears and errors with permission-denied.
        if (user) this.listen(firestore, user);
        else this.ignore();
    }

    ignore() {
        if (this.listenDefer) {
            this.listenDefer();
            this.listenDefer = undefined;
        }
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = undefined;
        }
    }

    listen(firestore: Firestore, user: User) {
        this.ignore();

        // Defer this background listener until the browser is idle so it doesn't
        // compete with the critical galleries/projects load on login.
        this.listenDefer = deferToIdle(() => {
            this.listenDefer = undefined;
            // The user may have signed out or switched during the idle gap.
            if (this.db.getUser()?.uid !== user.uid) return;
            this.startListening(firestore, user);
        });
    }

    private startListening(firestore: Firestore, user: User) {
        this.db.markSyncing(Domain.Characters);
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
                const synced: Character[] = [];
                snapshot.forEach((doc) => {
                    const character = doc.data();

                    // Try to parse the chat and save on success.
                    try {
                        const parsed = CharacterSchema.parse(character);

                        // Skip characters with unsaved local edits not yet
                        // pushed: our local copy is authoritative until
                        // flushUnsaved replays it, so don't let an older cloud
                        // version overwrite it in memory or the cache.
                        if (this.unsavedIDs.has(parsed.id)) return;

                        synced.push(parsed);

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

                // Mirror the cloud truth into the local cache for next cold start.
                this.cacheCharactersLocally(synced);

                // Next, go through the changes and see if any were explicitly removed, and if so, delete them.
                snapshot.docChanges().forEach((change) => {
                    // Removed? Delete the local cache of the project.
                    // Stop litening to the project's changes.
                    if (change.type === 'removed') {
                        const data = change.doc.data();
                        this.deleteCharacterLocally(data as Character);
                    }
                });

                this.db.markSynced(Domain.Characters, this.byID.size);
            },
            (error) => {
                // Always terminal so the save-status button stops spinning and
                // the dialog shows "failed" (incl. permission/index errors);
                // only connectivity errors flip the offline/unreachable state.
                this.db.markSyncFailed(Domain.Characters);
                if (this.db.isConnectivityError(error))
                    this.db.markFirebaseFailed();
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

        // Cache locally first (in memory and on disk) so the new character is
        // usable immediately, then save to the cloud, tracking save state.
        this.updateCharacter(character, false);
        this.cacheCharactersLocally([character]);
        await this.trackSave(
            character.id,
            character.name,
            setDoc(
                doc(firestore, CharactersCollection, character.id),
                character,
            ),
        );

        // Return the id to confirm we created it.
        return character.id;
    }

    async copy(character: Character) {
        return this.createCharacter(character);
    }

    /** Update the local store's version of this character, and defer a save to the database later. */
    async updateCharacter(
        character: Character,
        persist: boolean,
    ): Promise<Array<Project> | undefined> {
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

            if (existingCharacter) {
                this.byName.delete(existingCharacter.name);

                // Collect failures from project updates
                const failedProjects: Project[] = [];

                // Collect all revision promises
                const revisionPromises =
                    this.db.Projects.allEditableProjects.map(
                        async (project) => {
                            const revisions: [Node, Node | undefined][] = [];

                            // Look through each source file in the project
                            for (const source of project.getSources()) {
                                // If the source contains a ConceptLink node that references the old character name,
                                // update it with the new character name.
                                source
                                    .nodes()
                                    .filter(
                                        (node) => node instanceof ConceptLink,
                                    )
                                    .map((node) => {
                                        const parsed = ConceptLink.parse(
                                            node.getName(),
                                        );
                                        if (
                                            parsed instanceof CharacterName &&
                                            existingCharacter.name ===
                                                `${parsed.username}/${parsed.name}`
                                        ) {
                                            // Revise the ConceptLink node with the new character name.
                                            revisions.push([
                                                node,
                                                ConceptLink.make(
                                                    `${character.name}`,
                                                ),
                                            ]);
                                        }
                                    });
                            }

                            if (revisions.length > 0) {
                                const newProject =
                                    project.withRevisedNodes(revisions);
                                const failure =
                                    await this.db.Projects.reviseProject(
                                        newProject,
                                    );

                                if (failure !== undefined)
                                    failedProjects.push(project);
                            }
                        },
                    );

                // Wait for all revision attempts to complete
                await Promise.all(revisionPromises);

                // If there were failures, return a list of the failed projects
                if (failedProjects.length > 0) {
                    return failedProjects;
                }
            }

            this.byName.set(character.name, character);
        }

        // Are we to persist? Mirror to the local cache and defer a cloud save.
        if (persist) {
            this.cacheCharactersLocally([character]);
            // Mark unsaved right away so the save-status count reflects the edit
            // before the debounced cloud write runs.
            this.unsavedIDs.add(character.id);
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
        const db = firestore;
        // Each write tracks its own save state (unsaved / saved / failed) via
        // trackSave, so one failure doesn't hide the others.
        const results = await Promise.all(
            Array.from(this.unsaved.values()).map((character) =>
                this.trackSave(
                    character.id,
                    character.name,
                    setDoc(
                        doc(db, CharactersCollection, character.id),
                        character,
                    ),
                ),
            ),
        );
        this.db.setStatus(
            results.every((ok) => ok) ? SaveStatus.Saved : SaveStatus.Error,
            undefined,
        );
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
            const onlineMatchByID = await this.db.read(
                getDoc(doc(firestore, CharactersCollection, id)),
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
            const onlineMatchByName = await this.db.read(
                getDocs(
                    query(
                        collection(firestore, CharactersCollection),
                        and(
                            where('name', '==', name),
                            or(
                                where('public', '==', true),
                                where('owner', '==', user.uid),
                                where(
                                    'collaborators',
                                    'array-contains',
                                    user.uid,
                                ),
                            ),
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

    /** Delete a character, if the owner. Returns whether the delete reached the
     *  cloud, so callers (e.g. the editor) can gate navigation on success rather
     *  than redirecting away as if it worked. */
    async deleteCharacter(id: string): Promise<boolean> {
        const user = this.db.getUser();
        if (user === null) return false;
        const char = await this.getByID(id);
        if (char === null || char === undefined) return false;
        if (user.uid !== char.owner) return false;
        if (firestore === undefined) return false;
        // Confirm-then-remove: only drop local state once the cloud delete
        // lands, so a failed/offline delete can't strand a cloud copy the
        // user can no longer see. write() fails fast instead of hanging.
        try {
            await this.db.write(
                deleteDoc(doc(firestore, CharactersCollection, id)),
            );
            this.deleteCharacterLocally(char);
            return true;
        } catch (err) {
            this.db.reportBanner((l) => l.ui.banner.deleteFailed, err);
            return false;
        }
    }

    deleteCharacterLocally(character: Character) {
        this.byName.delete(character.name);
        this.byID.delete(character.id);
        this.unsaved.delete(character.id);
        // Drops the unsaved/error state AND the durable dirty row, so a
        // character deleted while dirty can't re-seed unsavedIDs on reload.
        this.saves.forget(character.id);
        if (this.IndexedDBSupported)
            void this.db.localDB.deleteCharacter(character.id);
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

    /** Available character names for autocomplete, sorted owned → collaborator → other. */
    getAvailableCharacterNamesForAutocomplete(): string[] {
        const uid = this.db.getUser()?.uid;
        const rank = (character: Character) =>
            character.owner === uid
                ? 0
                : uid !== undefined && character.collaborators.includes(uid)
                  ? 1
                  : 2;
        return this.getAvailableCharacters()
            .map((character) => ({ character, rank: rank(character) }))
            .sort((a, b) => a.rank - b.rank)
            .map(({ character }) => character.name);
    }
}
