////////////////////////////////
// CACHE
////////////////////////////////

import {
    bareCharacterName,
    CharacterSchema,
    type Character,
} from '@db/characters/Character';
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
import { REMIX_SYMBOL } from '@parser/Symbols';
import deferToIdle from '@util/deferToIdle';
import { FirebaseError } from 'firebase/app';
import type { User } from 'firebase/auth';
import { GALLERY_CHUNK_SIZE } from '@db/firestoreLimits';
// Under projects/ because that is where the sweep was first needed, but the
// rule it encodes is about any locally-cached thing a listener can stop
// matching, and it imports nothing.
import isSweepable from '@db/projects/isSweepable';
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
    type DocumentData,
    type Firestore,
    type QuerySnapshot,
    type Unsubscribe,
} from 'firebase/firestore';
import { SvelteMap } from 'svelte/reactivity';
import { v4 as uuidv4 } from 'uuid';

const CharactersCollection = Domain.Characters;

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

    /** The realtime listener unsubscribers: one for the characters the user
     *  owns or collaborates on, plus one per gallery chunk (#822). */
    private unsubscribes: Unsubscribe[] = [];

    /** The character IDs each listener currently matches, keyed by listener,
     *  for the cross-listener deletion sweep. A character leaving one query
     *  (say, taken out of a gallery) is not gone — another listener may still
     *  hold it — so removal is decided against the union, never per snapshot. */
    private listenerCharacterIDs: Map<string, Set<string>> = new Map();

    /** How many listeners must report before the sweep can conclude anything. */
    private expectedCharacterListeners = 0;

    /** Characters a cloud snapshot has shown us at least once — the character
     *  analogue of a project's `isPersisted`. A character that has never been
     *  in the cloud has no server-side copy to have been deleted, so its
     *  absence from every listener says nothing about it, and sweeping it
     *  would take the only copy. See {@link isSweepable}. */
    private seenInCloud: Set<string> = new Set();

    /** The set of gallery IDs the chunk listeners are built from, so a gallery
     *  change that doesn't alter the set doesn't churn every query. */
    private watchedGalleryKey: string | undefined = undefined;

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
        this.seenInCloud.clear();
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
        for (const unsubscribe of this.unsubscribes) unsubscribe();
        this.unsubscribes = [];
        this.listenerCharacterIDs.clear();
        this.expectedCharacterListeners = 0;
        this.watchedGalleryKey = undefined;
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

        // The galleries the user belongs to, chunked. The read rule get()s
        // each matched character's gallery, and Firestore denies a whole query
        // that needs more distinct document accesses than its budget allows —
        // so the gallery filter is spread across several listeners rather than
        // one. See src/db/firestoreLimits.ts and the same split in
        // ProjectsDatabase.syncUser.
        const galleryIDs = Array.from(
            this.db.Galleries.accessibleGalleries.keys(),
        );
        this.watchedGalleryKey = [...galleryIDs].sort().join(',');
        const chunks: string[][] = [];
        for (let i = 0; i < galleryIDs.length; i += GALLERY_CHUNK_SIZE)
            chunks.push(galleryIDs.slice(i, i + GALLERY_CHUNK_SIZE));

        this.listenerCharacterIDs.clear();
        this.expectedCharacterListeners = 1 + chunks.length;

        const onError = (error: unknown) => {
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
        };

        // The characters the user owns or collaborates on.
        this.unsubscribes.push(
            onSnapshot(
                query(
                    collection(firestore, CharactersCollection),
                    or(
                        where('owner', '==', user.uid),
                        where('collaborators', 'array-contains', user.uid),
                    ),
                ),
                (snapshot) => this.handleSnapshot('base', user, snapshot),
                onError,
            ),
        );

        // The characters their gallery-mates have shared (#822). Streaming
        // these is what makes a `@username/Character` reference to a
        // classmate's drawing resolve from the cache like any other.
        chunks.forEach((chunk, index) => {
            this.unsubscribes.push(
                onSnapshot(
                    query(
                        collection(firestore, CharactersCollection),
                        where('gallery', 'in', chunk),
                    ),
                    (snapshot) =>
                        this.handleSnapshot(`gallery:${index}`, user, snapshot),
                    onError,
                ),
            );
        });
    }

    /** Re-subscribe when the set of galleries the user belongs to changes,
     *  since the chunk listeners' filter is built from it. A no-op when the
     *  set is the same, so gallery edits don't churn every query. */
    galleriesChanged() {
        if (firestore === undefined) return;
        const user = this.db.getUser();
        if (user === null) return;
        const key = Array.from(this.db.Galleries.accessibleGalleries.keys())
            .sort()
            .join(',');
        if (key === this.watchedGalleryKey) return;
        this.listen(firestore, user);
    }

    private handleSnapshot(
        key: string,
        user: User,
        snapshot: QuerySnapshot<DocumentData>,
    ) {
        // Record the full set this listener matches, for the sweep below.
        const seen = new Set<string>();

        const synced: Character[] = [];
        snapshot.forEach((doc) => {
            const character = doc.data();

            // Try to parse the character and save on success.
            try {
                const parsed = CharacterSchema.parse(character);
                seen.add(parsed.id);
                // Before the skip below: this records that the cloud has this
                // character, which is true whether or not we take its copy.
                this.seenInCloud.add(parsed.id);

                // Skip characters with unsaved local edits not yet
                // pushed: our local copy is authoritative until
                // flushUnsaved replays it, so don't let an older cloud
                // version overwrite it in memory or the cache.
                if (this.unsavedIDs.has(parsed.id)) return;

                synced.push(parsed);

                // If the character's update time is greater than the cached one, or there is no cached one, update.
                // Update the character in the local cache, but do not persist; we just got it from the DB.
                const cached = this.byID.get(parsed.id);
                if (
                    cached === undefined ||
                    cached === null ||
                    parsed.updated > cached.updated
                ) {
                    this.updateCharacter(parsed, false);
                }
            } catch (error) {
                // If it doesn't parse, then we don't save it.
                console.error(error);
            }
        });

        this.listenerCharacterIDs.set(key, seen);

        // Mirror the cloud truth into the local cache for next cold start.
        this.cacheCharactersLocally(synced);

        // Cross-listener cleanup. A character that leaves one query has not
        // necessarily been deleted — taking your own character out of a
        // gallery drops it from that chunk listener while the base listener
        // still holds it — so a removal only counts when NO listener matches
        // it any more, and only once every listener has reported.
        //
        // Only against server-fresh data, for the reason handleProjectsSnapshot
        // gives: a cache-sourced snapshot can predate a write that has already
        // landed, and concluding "deleted" from it would be concluding it from
        // a stale list.
        if (
            !snapshot.metadata.fromCache &&
            this.listenerCharacterIDs.size === this.expectedCharacterListeners
        ) {
            const union = new Set<string>();
            for (const ids of this.listenerCharacterIDs.values())
                for (const id of ids) union.add(id);

            for (const character of Array.from(this.byID.values())) {
                if (character === null) continue;
                // Only characters these listeners are supposed to match are
                // sweepable. A public character of someone else's, pulled in
                // by getByName to render a reference, is in no query and must
                // survive.
                const watched =
                    character.owner === user.uid ||
                    character.collaborators.includes(user.uid) ||
                    (character.gallery != null &&
                        this.db.Galleries.accessibleGalleries.has(
                            character.gallery,
                        ));
                // The same rule projects use, from the same module rather
                // than restated here: a wrong keep costs a stale row that a
                // later snapshot sweeps, a wrong delete costs the only copy.
                // `editing` is false because characters have no coediting
                // session — that guard is the project's alone.
                if (
                    watched &&
                    isSweepable({
                        persisted: this.seenInCloud.has(character.id),
                        matched: union.has(character.id),
                        unsaved: this.unsavedIDs.has(character.id),
                        editing: false,
                    })
                )
                    this.deleteCharacterLocally(character);
            }
        }

        this.db.markSynced(Domain.Characters, this.byID.size);
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
            // Persist the given character as a new one owned by this user,
            // keeping its name and collaborators (the caller — copy() — has
            // already prepared them).
            character = {
                ...character,
                id: uuidv4(),
                owner: user.uid,
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

    /** Duplicate a character as a new one owned by the current user. */
    async copy(character: Character) {
        const user = this.db.getUser();
        if (user === null) return undefined;

        // Re-base the name onto the current user's username (the source may be
        // owned by someone else), keeping just the bare name after the prefix.
        const username = this.db.getUsername();
        if (username === undefined) return undefined;
        const base = bareCharacterName(character);

        // Mark it as a duplicate with the remix symbol — the same glyph a
        // remixed project's name gets — adding more until the bare name is
        // unused among the user's characters. Not the copy symbol: that means
        // "put this on the clipboard" everywhere else.
        let name = base + REMIX_SYMBOL;
        while (
            this.getOwnedCharacterWithName(`${username}/${name}`) !== undefined
        )
            name += REMIX_SYMBOL;

        return this.createCharacter({
            ...character,
            collaborators: [],
            // A remix is yours and starts out shared with nobody, exactly as a
            // remixed project leaves its gallery behind (#822). Sharing it
            // back is a separate, deliberate act.
            gallery: null,
            name: `${username}/${name}`,
        });
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

                // Renaming a character rewrites the projects that use it, so
                // this genuinely needs the projects database — loaded here
                // rather than imported, so editing a character is what pulls
                // in the language runtime rather than opening any page.
                const projects = await this.db.loadProjects();

                // Collect all revision promises
                const revisionPromises = projects.allEditableProjects.map(
                    async (project) => {
                        const revisions: [Node, Node | undefined][] = [];

                        // Look through each source file in the project
                        for (const source of project.getSources()) {
                            // If the source contains a ConceptLink node that references the old character name,
                            // update it with the new character name.
                            source
                                .nodes()
                                .filter((node) => node instanceof ConceptLink)
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
                                await projects.reviseProject(newProject);

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
        // Deliberately not gated on being signed in (#742): the security
        // rules have always allowed anyone to read a public character, and
        // bailing here meant no character at all resolved for a signed-out
        // visitor — so a public project using one showed an empty box, and a
        // public gallery's characters would be blank for exactly the audience
        // `public` is for.
        if (firestore === undefined) return undefined;

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
        // Signed out is fine; see getByID (#742).
        if (firestore === undefined) return undefined;
        const user = this.db.getUser();

        try {
            let match: Character | null = null;

            // Check the database by name. The visibility disjunction is the
            // same for both attempts, so it's built once. Signed out, it
            // narrows to public alone: an `array-contains` against an
            // undefined uid isn't a query Firestore will accept, and a
            // signed-out visitor can read nothing else anyway.
            const visible =
                user === null
                    ? where('public', '==', true)
                    : or(
                          where('public', '==', true),
                          where('owner', '==', user.uid),
                          where('collaborators', 'array-contains', user.uid),
                      );
            let onlineMatchByName = await this.db.read(
                getDocs(
                    query(
                        collection(firestore, CharactersCollection),
                        and(where('name', '==', name), visible),
                    ),
                ),
            );
            // Nothing under that name? Try the names it used to have. A
            // creator can rename themselves, which moves their characters with
            // them — but `@oldname/Character` is a language token that may sit
            // in anyone's project, and rewriting other people's source to chase
            // a rename would be far worse than one extra query on a miss. Only
            // on a miss, and `byName` keeps repeat lookups off it entirely.
            if (onlineMatchByName.empty)
                onlineMatchByName = await this.db.read(
                    getDocs(
                        query(
                            collection(firestore, CharactersCollection),
                            and(
                                where('aliases', 'array-contains', name),
                                visible,
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
        // Never leave a stale "was in the cloud" bit behind: a character
        // deleted and then recreated under the same id would inherit it and
        // become sweepable before its own first snapshot.
        this.seenInCloud.delete(character.id);
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

    /**
     * The character the current user owns under the given full
     * `username/Name`, if any, ignoring the one being edited.
     *
     * Owner-scoped and matched on the FULL name, because the full name is what
     * `byName` and the `where('name','==',…)` lookup are keyed on — two
     * creators naming a character `Dog` collide with nothing, while one
     * creator doing so makes `@them/Dog` resolve to whichever document the
     * query happens to land on last.
     *
     * This replaces a check that compared BARE names across every character
     * the user could *edit*, which includes ones they merely collaborate on:
     * collaborating on `bob/Dog` wrongly reported `Dog` as taken.
     */
    getOwnedCharacterWithName(
        fullName: string,
        exceptID?: string,
    ): Character | undefined {
        const uid = this.db.getUser()?.uid;
        if (uid === undefined) return undefined;
        return Array.from(this.byID.values())
            .filter((character) => character !== null)
            .find(
                (character) =>
                    character.owner === uid &&
                    character.name === fullName &&
                    character.id !== exceptID,
            );
    }

    /** The cached characters shared in the given gallery (#822), sorted by
     *  their bare name the way a gallery's projects are sorted by theirs.
     *  Reads only the cache: the chunk listeners keep it current for a member,
     *  and the gallery page fetches by ID for anyone else. */
    getGalleryCharacters(galleryID: string, languages: string[]): Character[] {
        return Array.from(this.byID.values())
            .filter((character) => character !== null)
            .filter((character) => character.gallery === galleryID)
            .sort((a, b) =>
                bareCharacterName(a).localeCompare(
                    bareCharacterName(b),
                    languages,
                ),
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
