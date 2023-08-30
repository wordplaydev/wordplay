import Dexie, { liveQuery, type Observable, type Table } from 'dexie';
import type { SerializedProject } from '../models/Project';
import { ProjectHistory } from './ProjectHistory';
import { writable, type Writable } from 'svelte/store';
import Project from '../models/Project';
import type { Locale } from '../locale/Locale';
import { SaveStatus, type Database } from './Database';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { firestore } from './firebase';
import type Node from '../nodes/Node';
import Source from '../nodes/Source';
import { examples } from '../examples/examples';

export class ProjectsDexie extends Dexie {
    projects!: Table<SerializedProject>;

    constructor() {
        super('wordplay');
        this.version(1).stores({
            projects: '++id, name, locales, owner, collabators',
        });
    }

    async getProject(id: string): Promise<SerializedProject | undefined> {
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

    /** A cache of read only projects, by project ID. */
    readonly readonlyProjects: Map<string, Project> = new Map();

    /** Debounce timer, used to clear pending requests. */
    private timer: NodeJS.Timeout | undefined = undefined;

    constructor(database: Database) {
        this.database = database;

        // Hydrate the editable projects from disk
        this.hydrate();

        // Eventually Add the examples to the read only database.
        Promise.all(
            Array.from(examples.values()).map(async (example) =>
                this.track(
                    await Project.deserializeProject(
                        this.database.Locales,
                        example
                    ),
                    false,
                    false,
                    false
                )
            )
        );
    }

    async hydrate() {
        // Local DB support?
        if (this.IndexedDBSupported) {
            this.editableProjects = await this.localDB.getAllProjects();

            if (this.editableProjects && this.editableProjects.getValue) {
                // Sync every time projects changes
                this.editableProjects.subscribe((projects) =>
                    this.sync(projects)
                );
                // Sync now
                // this.sync(this.editableProjects.getValue());
            }
        }

        // We don't pull projects from the cloud. That's handled by a realtime Firestore query and happens upon login, and whenever records change.
    }

    async sync(serialized: SerializedProject[]) {
        // Get all the projects from disk, deserialize them.
        const projects = await this.deserializeAll(serialized);

        // Track each as editable, but don't persist back to the local database, since we just read them from disk.
        for (const project of projects) this.track(project, true, true, false);
    }

    async deserializeAll(serialized: SerializedProject[]) {
        // Load all of the projects and their locale dependencies.
        return (
            await Promise.all(
                serialized.map((project) => this.deserialize(project))
            )
        ).filter((project): project is Project => project !== undefined);
    }

    async deserialize(
        project: SerializedProject
    ): Promise<Project | undefined> {
        return Project.deserializeProject(this.database.Locales, project);
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
        persist: boolean,
        saved: boolean
    ): ProjectHistory | undefined {
        if (editable) {
            // If we're not tracking this yet, create a history and store the version given.
            // If persisted, request a save.
            let history = this.projectHistories.get(project.id);
            if (history === undefined) {
                history = new ProjectHistory(project, persist, saved);
                this.projectHistories.set(project.id, history);

                // Update the editable projects
                this.refreshEditableProjects();

                // Defer a save.
                if (persist) this.saveSoon();

                // Return the history
                return history;
            }
            // If we already have a history, then reconcile the given version with the current history.
            else {
                const current = history.getCurrent();

                // If the new project is archived, and we're just a collaborator on it, deleted it.
                const userID = this.database.getUserID();
                if (
                    project.isArchived() &&
                    userID &&
                    project.hasCollaborator(userID)
                ) {
                    this.localDB.deleteProject(project.id);
                    this.projectHistories.delete(project.id);
                }
                // Otherwise, if the given one has the later timestamp, overwrite. This is naive strategy that
                // assumes that all systems have valid clocks, and it also fails to acccount
                // for non-conflicting edits.
                else if (project.timestamp > current.timestamp) {
                    history.edit(project, true, true);
                }
            }

            this.refreshEditableProjects();
        } else {
            this.readonlyProjects.set(project.id, project);
        }
    }

    /** Get all the current projects in a list so that anything that depends on the projects has a fresh list. */
    refreshEditableProjects() {
        this.allEditableProjects.set(
            Array.from(this.projectHistories.values())
                .map((history) => history.getCurrent())
                .filter((project) => !project.isArchived())
        );
    }

    /** Create a project and return it's ID */
    create(locales: Locale[], code = '') {
        const userID = this.database.getUserID();
        // Make the new project
        const newProject = new Project(
            null,
            '',
            new Source(locales[0].term.start, code),
            [],
            // The project starts with all of the locales currently selected in the config.
            locales,
            // User owns the project
            userID,
            // No collaborators
            []
        );

        // Track the new project, and request that it be persisted.
        this.track(newProject, true, true, false);

        // Return it's new ID
        return newProject.id;
    }

    /** Returns the current version of the project with the given ID, if it exists. */
    async get(id: string): Promise<Project | undefined> {
        // First, check read only projects.
        const readonly = this.readonlyProjects.get(id);
        if (readonly) return readonly;

        // First, check memory. If it's in the local DB, it should be in memory.
        const project = this.projectHistories.get(id)?.getCurrent();
        if (project !== undefined) return project;

        // Not there? Check the local database. We may not have finished hydrating yet.
        if (this.IndexedDBSupported) {
            const localProject = await this.localDB.getProject(id);
            if (localProject !== undefined) {
                const proj = await this.deserialize(localProject);
                if (proj) {
                    this.track(proj, true, false, false);
                    return proj;
                }
            }
        }

        // Not there? See if Firebase has it.
        if (firestore) {
            try {
                const projectDoc = await getDoc(doc(firestore, 'projects', id));
                if (projectDoc.exists()) {
                    const project = await this.deserialize(
                        projectDoc.data() as SerializedProject
                    );
                    if (project !== undefined)
                        this.track(project, false, false, false);
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
     * @param remember If true, keeps the current vesion of the project in the history, otherwise replaces it.
     * @param persist If true, try to save the change to disk and the cloud
     * */
    edit(project: Project, remember: boolean, persist: boolean) {
        // Update or create a history for this project.
        const history = this.projectHistories.get(project.id);
        if (history) {
            history.edit(project, remember);

            // Update the editable projects.
            this.refreshEditableProjects();

            // Defer a save.
            if (persist) this.saveSoon();
        }
        // No history? Not editable, do nothing.
    }

    /** Delete the project with the given ID, if it exists */
    async archiveProject(id: string) {
        // For now, we don't actually delete projects, we just mark them archived.
        // This prevents accidental data loss.
        const history = this.projectHistories.get(id);
        if (history) this.edit(history.getCurrent().asArchived(), false, true);
    }

    async archiveAllProjects() {
        for (const history of this.projectHistories.values())
            await this.archiveProject(history.id);
        await this.persist();
    }

    /** Persist in storage */
    async persist() {
        const userID = this.database.getUserID();

        const editable = Array.from(this.projectHistories.values());
        const persisted = editable.filter((history) => history.isPersisted());

        // First, save all projects to the local DB, including the user ID if they don't have it already.
        if ('indexedDB' in window) {
            this.database.setStatus(SaveStatus.Saving);
            try {
                this.localDB.saveProjects(
                    persisted.map((history) => history.getCurrent().serialize())
                );
            } catch (_) {
                this.database.setStatus(SaveStatus.Error);
            }
            this.database.setStatus(SaveStatus.Saved);
        } else {
            this.database.setStatus(SaveStatus.Error);
        }

        // Then, try to save them in Firebase if we have a user ID.
        if (firestore && userID) {
            this.database.setStatus(SaveStatus.Saving);

            const unsaved = persisted.filter((history) => history.isUnsaved());

            try {
                // Create a batch of all of the new and updated projects.
                const batch = writeBatch(firestore);
                for (const project of unsaved.map((history) => {
                    const current = history.getCurrent();
                    // If the project has no owner, make this user owner, since it was stored locally.
                    return (
                        current.owner === null
                            ? current.withOwner(userID)
                            : current
                    ).serialize();
                }))
                    batch.set(doc(firestore, 'projects', project.id), project);
                await batch.commit();

                // Mark all projects saved to the cloud if successful.
                this.projectHistories.forEach((history) => history.markSaved());

                // Mark status as saved
                this.database.setStatus(SaveStatus.Saved);
            } catch (error) {
                if (error instanceof FirebaseError) {
                    console.error(error.code);
                    console.error(error.message);
                }
                this.database.setStatus(SaveStatus.Error);
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
    reviseProject(revised: Project, remember = true) {
        this.edit(revised, remember, true);
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
    undoRedo(id: string, direction: -1 | 1): Project | undefined {
        const history = this.projectHistories.get(id);
        // No record of this project? Do nothing.
        if (history === undefined) return undefined;

        // Try to undo/redo
        const project = history.undoRedo(direction);

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
        this.database.setStatus(SaveStatus.Saving);

        // Clear pending saves.
        clearTimeout(this.timer);

        // Initiate another.
        this.timer = setTimeout(() => this.persist(), 1000);
    }
}
