import Dexie, { liveQuery, type Observable, type Table } from 'dexie';
import { PersistenceType, ProjectHistory } from './ProjectHistory';
import { writable, type Writable } from 'svelte/store';
import Project from '../models/Project';
import type { Locale } from '../locale/Locale';
import { Locales, SaveStatus, type Database } from './Database';
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    onSnapshot,
    or,
    query,
    setDoc,
    where,
    writeBatch,
    type Unsubscribe,
} from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { firestore } from './firebase';
import type Node from '../nodes/Node';
import Source from '../nodes/Source';
import { ExamplePrefix, getExample } from '../examples/examples';
import { unknownFlags } from '../models/Moderation';
import {
    ProjectSchemaLatestVersion,
    upgradeProject,
    type SerializedProject,
    type SerializedProjectUnknownVersion,
    ProjectSchema,
} from '../models/ProjectSchemas';
import { PossiblePII } from '@conflicts/PossiblePII';
import { EditFailure } from './EditFailure';

/** The name of the projects collection in Firebase */
export const ProjectsCollection = 'projects';

/**
 * Projects shouldn't be larger than 1,048,576 bytes, the Firestore document limit.
 */
export const MAX_PROJECT_BYTE_SIZE = 1048576;

/** The schema of the IndexedDB cache of projects. */
export class ProjectsDexie extends Dexie {
    projects!: Table<SerializedProject>;

    constructor() {
        super('wordplay');
        this.version(ProjectSchemaLatestVersion).stores({
            projects: '++id, name, locales, owner, collabators',
        });
    }

    async getProject(
        id: string,
    ): Promise<SerializedProjectUnknownVersion | undefined> {
        const project = await this.projects.where('id').equals(id).toArray();
        return project[0];
    }

    async deleteProject(id: string): Promise<void> {
        return await this.projects.delete(id);
    }

    saveProjects(projects: SerializedProject[]) {
        this.projects.bulkPut(projects);
    }

    async getAllProjects(): Promise<Observable<SerializedProject[]>> {
        return liveQuery(() => this.projects.toArray());
    }
}

export default class ProjectsDatabase {
    /** The database that manages this */
    readonly database: Database;

    /** An IndexedDB backed database of projects, allowing for scalability of local persistence. */
    readonly localDB = new ProjectsDexie();

    /** Wether this is in a browser with indexed db support */
    readonly IndexedDBSupported =
        typeof window !== 'undefined' && 'indexedDB' in window;

    /** The local live query that we listen to for cross-tab local changes */
    private editableProjects: Observable<SerializedProject[]> | undefined =
        undefined;

    /** An in-memory index of project histories by project ID. Populated on load, synced with local IndexedDB and cloud Firestore, when available. */
    private projectHistories: Map<string, ProjectHistory> = new Map();

    /** A store of all user editable projects stored in projectsDB. Derived from editable projects above. */
    readonly allEditableProjects: Writable<Project[]> = writable([]);

    /** A store of all archived projects stored in projectsDB. Derived from editable projects above. */
    readonly allArchivedProjects: Writable<Project[]> = writable([]);

    /** A cache of read only projects, by project ID. */
    readonly readonlyProjects: Map<string, Project | undefined> = new Map();

    /** Remember how to unsubscribe from the user's realtime query. */
    private projectsQueryUnsubscribe: Unsubscribe | undefined = undefined;

    /** Debounce timer, used to clear pending requests. */
    private timer: NodeJS.Timeout | undefined = undefined;

    constructor(database: Database) {
        this.database = database;

        // Hydrate the editable projects from disk
        this.hydrate();
    }

    async hydrate() {
        // Local DB support?
        if (this.IndexedDBSupported) {
            this.editableProjects = await this.localDB.getAllProjects();

            // If we got an observable from the local DB, and it knows how to give us a value, sync whenever it changes.
            if (this.editableProjects && this.editableProjects.getValue) {
                // Sync every time projects changes locally
                this.editableProjects.subscribe((projects) =>
                    this.sync(projects),
                );
            }
        }

        // We don't pull projects from the cloud. That's handled by syncUser() when the user changes.
    }

    async sync(serialized: SerializedProject[]) {
        // Get all the projects from disk, deserialize them.
        const projects = await this.deserializeAll(serialized);

        // Track each as editable, but don't persist back to the local database, since we just read them from disk.
        // If it's a tutorial project, mark it as local saves only.
        for (const project of projects)
            this.track(
                project,
                true,
                project.isTutorial()
                    ? PersistenceType.Local
                    : PersistenceType.Online,
                true,
            );
    }

    async deserializeAll(serialized: unknown[]) {
        // Load all of the projects and their locale dependencies.
        return (
            await Promise.all(
                serialized.map((project) => this.parseProject(project)),
            )
        ).filter((project): project is Project => project !== undefined);
    }

    async deserialize(
        project: SerializedProjectUnknownVersion,
    ): Promise<Project | undefined> {
        return Project.deserialize(this.database.Locales, project);
    }

    /** When the user changes, update the projects from the cloud query */
    syncUser(remove: boolean) {
        // If we're supposed to remove local, do it before syncing the user.
        if (remove) this.deleteLocal();

        const user = this.database.getUser();

        // If there's no firestore access, do nothing.
        if (firestore === undefined) return;

        // Unsubscribe from the old user's realtime project query
        if (this.projectsQueryUnsubscribe) {
            this.projectsQueryUnsubscribe();
            this.projectsQueryUnsubscribe = undefined;
        }

        // If there's no more user, stop le, do nothing.
        if (user === null) return;

        // Set up the realtime projects query for the user, tracking any projects from the cloud,
        // and deleting any tracked locally that didn't appear in the snapshot.
        this.projectsQueryUnsubscribe = onSnapshot(
            query(
                collection(firestore, ProjectsCollection),
                or(
                    where('owner', '==', user.uid),
                    where('collaborators', 'array-contains', user.uid),
                ),
            ),
            async (snapshot) => {
                const serialized: unknown[] = [];
                const deleted: string[] = [];
                const projectIDs: Set<string> = new Set();

                // First, go through the entire set, gathering the latest versions and remembering what project IDs we know
                // so we can delete ones that are gone from the server.
                snapshot.forEach((doc) => {
                    const project = doc.data();
                    serialized.push(project);
                    projectIDs.add(project.id);
                });

                // Next, go through the changes and see if any were explicitly removed, and if so, delete them.
                snapshot.docChanges().forEach((change) => {
                    // Removed? Delete the local cache of the project.
                    if (change.type === 'removed') deleted.push(change.doc.id);
                });

                // Deserialize the projects and track them, if they're not already tracked
                for (const project of await this.deserializeAll(serialized))
                    this.track(project, true, PersistenceType.Online, true);

                // Find all projects 1) known locally, 2) that didn't appear in latest update
                // 3) were previously marked as cloud persisted, and 4) aren't pending
                for (const [
                    projectID,
                    history,
                ] of this.projectHistories.entries())
                    if (
                        history.getCurrent().isPersisted() &&
                        !projectIDs.has(projectID)
                    )
                        deleted.push(projectID);

                // Delete the deleted if the data was from the server.
                if (!snapshot.metadata.fromCache)
                    for (const id of deleted) await this.deleteLocalProject(id);

                // Refresh stores after everything is added and deleted.
                this.refreshEditableProjects();
            },
            (error) => {
                if (error instanceof FirebaseError) {
                    console.error(error.code);
                    console.error(error.message);
                }
                this.database.setStatus(
                    SaveStatus.Error,
                    (l) => l.ui.project.save.projectsNotLoadingOnline,
                );
            },
        );

        // If we have a user, save the current database to the cloud, in case there
        // were any local edits.
        this.saveSoon();
    }

    /**
     * Given a project, track it in memory. If we already track it, update it if it's more recently edited than this project.
     *
     * @param project The project to cache and track
     * @param editable Whether the project should be editable or read only
     * @param persist Whether this change should be persisted to the local and cloud databases
     * */
    track(
        project: Project,
        editable: boolean,
        persist: PersistenceType,
        saved: boolean,
    ): ProjectHistory | undefined {
        if (editable) {
            // If we're not tracking this yet, create a history and store the version given.
            let history = this.projectHistories.get(project.getID());
            if (history === undefined) {
                history = new ProjectHistory(project, persist, saved, Locales);
                this.projectHistories.set(project.getID(), history);

                // Update the editable projects
                this.refreshEditableProjects();

                // Request a save.
                this.saveSoon();

                // Return the history
                return history;
            }
            // If we already have a history, then reconcile the given version with the current history.
            else {
                const current = history.getCurrent();

                // Otherwise, if the given one has the later timestamp, overwrite. This is naive strategy that
                // assumes that all systems have valid clocks, and it also fails to acccount
                // for non-conflicting edits.
                if (project.getTimestamp() > current.getTimestamp()) {
                    history.edit(project, true, true);
                }
            }

            this.refreshEditableProjects();
        } else {
            this.readonlyProjects.set(project.getID(), project);
        }
    }

    /** Get all the current projects in a list so that anything that depends on the projects has a fresh list. */
    refreshEditableProjects() {
        this.allEditableProjects.set(
            Array.from(this.projectHistories.values())
                .map((history) => history.getCurrent())
                .filter((project) => !project.isArchived()),
        );
        this.allArchivedProjects.set(
            Array.from(this.projectHistories.values())
                .map((history) => history.getCurrent())
                .filter((project) => project.isArchived()),
        );
    }

    /** Create a project and return it's ID */
    create(locales: Locale[], code = '', galleryID?: string) {
        const userID = this.database.getUserID();
        // Make the new project
        const newProject = Project.make(
            null,
            '',
            new Source(locales[0].term.start, code),
            [],
            // The project starts with all of the locales currently selected in the config.
            locales,
            // User owns the project
            userID,
            // No collaborators
            [],
            // Not public
            false,
            // No carets yet
            undefined,
            // Yes listed
            true,
            // Not archived
            false,
            // Not yet persisted
            false,
            // Optional gallery ID
            galleryID ?? null,
            // Unknown moderation state
            unknownFlags(),
        );

        // Track the new project, and request that it be persisted.
        this.track(newProject, true, PersistenceType.Online, false);

        // Return it's new ID
        return newProject.getID();
    }

    copy(project: Project) {
        const clone = project.copy();
        this.track(clone, true, PersistenceType.Online, false);
        return clone.getID();
    }

    /** Returns the current version of the project with the given ID, if it exists. */
    async get(id: string): Promise<Project | undefined> {
        // First, check read only projects.
        const readonly = this.readonlyProjects.get(id);
        if (readonly) return readonly;

        // Is this an example? Load the example.
        if (id.startsWith(ExamplePrefix)) {
            const serialized = await getExample(id);
            const project = await (serialized === undefined
                ? undefined
                : Project.deserialize(this.database.Locales, serialized));
            this.readonlyProjects.set(id, project);
            return project;
        }

        // First, check memory. If it's in the local DB, it should be in memory.
        const project = this.projectHistories.get(id)?.getCurrent();
        if (project !== undefined) return project;

        // Not there? Check the local database. We may not have finished hydrating yet.
        if (this.IndexedDBSupported) {
            const localProject = await this.localDB.getProject(id);
            if (localProject !== undefined) {
                const proj = await this.deserialize(localProject);
                if (proj) {
                    this.track(
                        proj,
                        true,
                        proj.isTutorial()
                            ? PersistenceType.Local
                            : PersistenceType.Online,
                        false,
                    );
                    return proj;
                }
            }
        }

        // Not there? See if Firebase has it.
        if (firestore) {
            try {
                const projectDoc = await getDoc(
                    doc(firestore, ProjectsCollection, id),
                );
                if (projectDoc.exists()) {
                    const project = await this.parseProject(projectDoc.data());
                    if (project !== undefined)
                        this.track(
                            project,
                            false,
                            PersistenceType.Online,
                            false,
                        );
                    return project;
                }
            } catch (err) {
                return undefined;
            }
        }

        return undefined;
    }

    /**
     * Given a project that is assumed to be editable, find it's history, and then edit it.
     * @param project The revised project
     * @param remember If true, keeps the current version of the project in the history, otherwise replaces it.
     * @param persist If true, try to save the change to disk and the cloud
     *
     * Returns true if the edit was successful, false if it was not.
     * */
    edit(
        project: Project,
        remember: boolean,
        persist: boolean,
        dynamic: boolean = false,
    ): EditFailure | undefined {
        if (project.getSourceByteSize() > MAX_PROJECT_BYTE_SIZE)
            return EditFailure.TooLarge;

        // Update or create a history for this project.
        const history = this.projectHistories.get(project.getID());
        if (history) {
            // Save the project with a new time.
            const success = history.edit(
                project.withNewTime(),
                remember,
                false,
                dynamic,
            );

            // If the save was successful, update the projects and persist if asked.
            if (success === true) {
                // Update the editable projects.
                this.refreshEditableProjects();

                // Defer a save.
                if (persist) this.saveSoon();

                return undefined;
            } else return EditFailure.Infinite;
        }
        // No history? Directly edit the project in the database, if connected and asked to save the edit.
        // This is likely an edit by a curator of a gallery, e.g., removing a project from a collection.
        else if (firestore && persist) {
            setDoc(
                doc(firestore, ProjectsCollection, project.getID()),
                project.serialize(),
            );
            return undefined;
        }
        // Not editable? Return false.
        else return EditFailure.ReadOnly;
    }

    /** Archive/unarchive the project with the given ID, if it exists */
    async archiveProject(id: string, archive: boolean) {
        // For now, we don't actually delete projects, we just mark them archived.
        // This prevents accidental data loss.
        const history = this.projectHistories.get(id);
        if (history) {
            const current = history.getCurrent();

            // If the project is in a gallery, remove it.
            if (current.getGallery())
                await this.database.Galleries.removeProject(current);

            // Mark the project archived after its removed from the gallery.
            this.edit(current.asArchived(archive), false, true);
        }
    }

    async deleteOwnedProjects() {
        // Delete all projects that this user owns.
        const ownerID = this.database.getUserID();
        for (const history of this.projectHistories.values())
            if (history.getCurrent().getOwner() === ownerID)
                await this.deleteProject(history.id);
        await this.deleteLocal();
    }

    /** Permanently delete this project from the local and cloud database. */
    async deleteProject(id: string) {
        // No firestore access? Bail.
        if (firestore === undefined) return;

        // Get the project
        const project = await this.get(id);
        if (project === undefined) return;

        // Remove the project from it's gallery.
        await this.database.Galleries.removeProject(project);

        // Delete the project doc
        await deleteDoc(doc(firestore, ProjectsCollection, id));

        // Delete from the local cache.
        this.deleteLocalProject(id);

        // Refresh the project stores.
        this.refreshEditableProjects();
    }

    /** Delete project locally */
    async deleteLocalProject(id: string) {
        // Delete from the local cache.
        await this.localDB.deleteProject(id);

        // Untrack the project.
        this.projectHistories.delete(id);
    }

    /** Persist in storage */
    async persist() {
        const userID = this.database.getUserID();

        const editable = Array.from(this.projectHistories.values());
        // Only save unsaved local projects.
        const local = editable.filter(
            (history) =>
                history.isUnsaved() &&
                (history.getPersisted() === PersistenceType.Local ||
                    history.getPersisted() === PersistenceType.Online),
        );
        const online = editable.filter(
            (history) => history.getPersisted() === PersistenceType.Online,
        );

        // First, save all projects to the local DB, including the user ID if they don't have it already.
        if ('indexedDB' in window) {
            this.database.setStatus(SaveStatus.Saving, undefined);
            try {
                this.localDB.saveProjects(
                    local.map((history) => history.getCurrent().serialize()),
                );
            } catch (_) {
                this.database.setStatus(
                    SaveStatus.Error,
                    (l) => l.ui.project.save.projectsNotSavedLocally,
                );
            }
            this.database.setStatus(SaveStatus.Saved, undefined);
        } else {
            this.database.setStatus(
                SaveStatus.Error,
                (l) => l.ui.project.save.projectsCannotNotSaveLocally,
            );
        }

        // Then, try to save them in Firebase if we have a user ID.
        if (firestore && userID) {
            this.database.setStatus(SaveStatus.Saving, undefined);

            const unsaved = online.filter((history) => history.isUnsaved());
            /** Whether a project was not saved because it has PII. */
            let skipped = false;

            try {
                // Create a batch of all of the new and updated projects.
                const batch = writeBatch(firestore);
                for (const project of unsaved.map((history) => {
                    const current = history.getCurrent();

                    // Does the current one have any PII? If so, don't save it.
                    current.analyze();
                    if (
                        current
                            .getConflicts()
                            .some((conflict) => conflict instanceof PossiblePII)
                    )
                        return undefined;

                    // If the project has no owner, make this user owner, since it was stored locally.
                    return (
                        (
                            current.getOwner() === null
                                ? current.withOwner(userID)
                                : current
                        )
                            // Mark it as persisted, since we're about to save it that way.
                            .asPersisted()
                            .serialize()
                    );
                })) {
                    if (project)
                        batch.set(
                            doc(firestore, ProjectsCollection, project.id),
                            project,
                        );
                    else skipped = true;
                }
                await batch.commit();

                // Mark all projects saved to the cloud if successful.
                this.projectHistories.forEach((history) => history.markSaved());

                // Mark status as saved
                this.database.setStatus(
                    skipped ? SaveStatus.Error : SaveStatus.Saved,
                    skipped
                        ? (l) => l.ui.project.save.projectContainedPII
                        : undefined,
                );
            } catch (error) {
                if (error instanceof FirebaseError) {
                    console.error(error.code);
                    console.error(error.message);
                }
                this.database.setStatus(
                    SaveStatus.Error,
                    (l) => l.ui.project.save.projectNotSavedOnline,
                );
            }
        }
    }

    /** Revise all editable projects to use the specified locales */
    localize(locales: Locale[]) {
        for (const [, history] of this.projectHistories)
            history.withLocales(locales);
    }

    /** Shorthand for revising nodes in a project */
    revise(project: Project, revisions: [Node, Node | undefined][]) {
        this.reviseProject(project.withRevisedNodes(revisions));
    }

    /** Replaces the project with the given project, adding the current version to the history, and erasing the future, if there is any. */
    reviseProject(
        revised: Project,
        remember = true,
        dynamic = false,
    ): EditFailure | undefined {
        return this.edit(revised, remember, true, dynamic);
    }

    /** Gets the project history for the given project ID, if there is one. */
    getHistory(id: string) {
        return this.projectHistories.get(id);
    }

    /** Given a project ID, get the reactive store that stores it, so the caller can be notified when it changes. */
    getStore(id: string) {
        return this.projectHistories.get(id)?.getStore();
    }

    /** Given a project ID and direction, undo or redo */
    async undoRedo(
        id: string,
        direction: -1 | 1,
    ): Promise<Project | undefined> {
        const history = this.projectHistories.get(id);
        // No record of this project? Do nothing.
        if (history === undefined) return undefined;

        // Try to undo/redo
        const project = await history.undoRedo(direction);

        // If some change was made, persist the change
        if (project) this.saveSoon();

        return project;
    }

    /**
     * Trigger a save to local storage and the remote database at some point in the future.
     * Should be called any time this.projects is modified.
     */
    saveSoon() {
        // Note that we're saving.
        this.database.setStatus(SaveStatus.Saving, undefined);

        // Clear pending saves.
        clearTimeout(this.timer);

        // Initiate another.
        this.timer = setTimeout(() => this.persist(), 1000);
    }

    /** Deletes the local database (usually on logout, for privacy), and removes any projects from memory. */
    async deleteLocal() {
        this.localDB.delete();
        this.projectHistories.clear();
        this.refreshEditableProjects();
    }

    /** Attempt to parse a seralized project into a project. */
    async parseProject(data: unknown): Promise<Project | undefined> {
        // If the project data doesn't parse, then return nothing, since it's not valid.
        try {
            // Assume it's a project of an unknown version and upgrade it.
            const serialized = upgradeProject(
                data as SerializedProjectUnknownVersion,
            );
            // Now parse it with Zod, verifying it complies with the schema.
            const project = ProjectSchema.parse(serialized);
            // Now convert it to an in-memory project so we can manipulate it more easily.
            return await this.deserialize(project);
        } catch (_) {
            console.error(_);
            return undefined;
        }
    }
}
