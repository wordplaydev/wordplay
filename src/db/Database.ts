import Project, { type SerializedProject } from '@models/Project';
import type Node from '@nodes/Node';
import { writable, type Writable } from 'svelte/store';
import Source from '@nodes/Source';
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    onSnapshot,
    query,
    setDoc,
    where,
    writeBatch,
} from 'firebase/firestore';
import { firestore, auth } from '@db/firebase';
import { onAuthStateChanged, type Unsubscribe, type User } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import type Locale from '../locale/Locale';
import en from '../locale/en-US.json';
import {
    type SupportedLocale,
    getBestSupportedLocales,
} from '../locale/Locale';
import type Setting from './Setting';
import { ProjectsDatabase } from './ProjectsDatabase';
import { ProjectHistory } from './ProjectHistory';
import LocalesDatabase from './LocalesDatabase';
import SettingsDatabase from './SettingsDatabase';

export enum SaveStatus {
    Saved = 'saved',
    Saving = 'saving',
    Error = 'error',
}

export class Database {
    /** The database of local persisted settings */
    readonly settingsDB: SettingsDatabase;

    /** The database of loaded locales and settings. Encapsuled to avoid cluttering this central interface to persistence and caches. */
    readonly localesDB: LocalesDatabase;

    /** An IndexedDB backed database of projects, allowing for scalability of local persistence. */
    readonly projectsDB = new ProjectsDatabase();

    /** The status of persisting the projects. */
    readonly statusStore: Writable<SaveStatus> = writable(SaveStatus.Saved);

    /** An in-memory index of project histories by project ID. Populated on load, synced with local IndexedDB and cloud Firestore, when available. */
    private editableProjects: Map<string, ProjectHistory>;

    /** A store of all user editable projects stored in projectsDB */
    readonly editableProjectsStore: Writable<Project[]> = writable([]);

    /** A cache of read only projects, by project ID. */
    readonly readonlyProjects: Map<string, Project> = new Map();

    /** Debounce timer, used to clear pending requests. */
    private timer: NodeJS.Timeout | undefined = undefined;

    /** The current Firestore user ID */
    private uid: string | null = null;

    /** Realtime query unsubscribers */
    private authUnsubscribe: Unsubscribe | undefined = undefined;
    private projectsQueryUnsubscribe: Unsubscribe | undefined = undefined;

    constructor(locales: SupportedLocale[], defaultLocale: Locale) {
        this.settingsDB = new SettingsDatabase(this, locales);

        this.localesDB = new LocalesDatabase(
            this,
            locales,
            defaultLocale,
            this.settingsDB.settings.locales
        );

        // Initialize the in-memory project store from the local database.
        this.editableProjects = new Map();
        this.loadProjects();
    }

    getProjectStore(id: string) {
        return this.editableProjects.get(id)?.getStore();
    }

    localizeProjects(locales: Locale[]) {
        for (const [, history] of this.editableProjects)
            history.withLocales(locales);
    }

    /** Get a list of all current projects */
    async getAllCreatorProjects(): Promise<Project[]> {
        await this.loadProjects();
        return Array.from(this.editableProjects.values()).map((p) =>
            p.getCurrent()
        );
    }

    /** Returns the current version of the project with the given ID, if it exists. */
    async getProject(id: string): Promise<Project | undefined> {
        // First, check memory.
        const project = this.editableProjects.get(id)?.getCurrent();
        if (project !== undefined) return project;

        // Not there? Check the local database.
        if (IndexedDBSupported) {
            const localProject = await this.projectsDB.getProject(id);
            if (localProject !== undefined) {
                const proj = await this.deserializeProject(localProject);
                if (proj) {
                    this.addOrUpdateProject(proj, false, true);
                    return proj;
                }
            }
        }

        // Not there? See if Firebase has it.
        if (firestore) {
            try {
                const projectDoc = await getDoc(doc(firestore, 'projects', id));
                if (projectDoc.exists()) {
                    const project = await this.deserializeProject(
                        projectDoc.data() as SerializedProject
                    );
                    if (project !== undefined)
                        this.addOrUpdateProject(project, false, false);
                    return project;
                }
            } catch (err) {
                return undefined;
            }
        }

        return undefined;
    }

    async loadProjects() {
        if (IndexedDBSupported) {
            const projects = await this.projectsDB.getAllProjects();
            await this.updateProjects(projects);
            this.updateEditableProjects();
        }
    }

    /** Create a project and return it's ID */
    createProject(locales: Locale[], uid: string | undefined, code = '') {
        const newProject = new Project(
            null,
            '',
            new Source(locales[0].term.start, code),
            [],
            // The project starts with all of the locales currently selected in the config.
            locales,
            uid ? [uid] : []
        );
        this.addOrUpdateProject(newProject, false, true);
        return newProject.id;
    }

    /** Batch set projects */
    setProjects(projects: Project[], persist = true) {
        for (const project of projects)
            this.addOrUpdateProject(project, false, persist);
    }

    addOrUpdateProject(
        project: Project,
        remember: boolean,
        persist: boolean
    ): ProjectHistory {
        // Update or create a history for this project.
        let history = this.editableProjects.get(project.id);
        if (history) history.edit(project, remember);
        else {
            history = new ProjectHistory(project, persist);
            this.editableProjects.set(project.id, history);
        }

        // Update the editable projects.
        this.updateEditableProjects();

        // Defer a save.
        if (persist) this.requestProjectsSave();

        return history;
    }

    updateEditableProjects() {
        this.editableProjectsStore.set(
            Array.from(this.editableProjects.values())
                .map((history) => history.getCurrent())
                .filter((project) =>
                    this.uid === null ? false : project.isReadOnly(this.uid)
                )
        );
    }

    /** Delete the project with the given ID, if it exists */
    async deleteProject(id: string) {
        // Delete from the cache
        this.editableProjects.delete(id);

        // Update the editables.
        this.updateEditableProjects();

        // Delete from the local database
        this.projectsDB.deleteProject(id);

        // Delete from firebase
        if (firestore && this.uid) {
            try {
                await deleteDoc(doc(firestore, 'projects', id));
            } catch (error) {
                if (error instanceof FirebaseError) {
                    console.error(error.code);
                    console.error(error.message);
                }
                this.setStatus(SaveStatus.Error);
            }
        }
    }

    /** Shorthand for revising nodes in a project */
    reviseProjectNodes(
        project: Project,
        revisions: [Node, Node | undefined][]
    ) {
        this.reviseProject(project.withRevisedNodes(revisions));
    }

    /** Replaces the project with the given project, adding the current version to the history, and erasing the future, if there is any. */
    reviseProject(revised: Project, remember = true) {
        this.addOrUpdateProject(revised, remember, true);
    }

    getProjectHistory(id: string) {
        return this.editableProjects.get(id);
    }

    undoRedoProject(id: string, direction: -1 | 1): Project | undefined {
        const history = this.editableProjects.get(id);
        // No record of this project? Do nothing.
        if (history === undefined) return undefined;

        const project = history.undoRedo(direction);
        if (project) this.requestProjectsSave();

        return project;
    }

    /**
     * Trigger a save to local storage and the remote database at some point in the future.
     * Should be called any time this.projects is modified.
     */
    requestProjectsSave() {
        // Note that we're saving.
        this.setStatus(SaveStatus.Saving);

        // Clear pending saves.
        clearTimeout(this.timer);

        // Initiate another.
        this.timer = setTimeout(() => this.persistProjects(), 1000);
    }

    /** Update the saving status and broadcast via the store. */
    setStatus(status: SaveStatus) {
        this.statusStore.set(status);
    }

    /** Convert to an object suitable for JSON serialization */
    toProjectsObject(): SerializedProject[] {
        return Array.from(this.editableProjects.values())
            .filter((history) => history.isPersisted())
            .map((history) => history.getCurrent().serialize());
    }

    /** Saves settings to Firebase, if available. */
    persistSettings() {
        this.setStatus(SaveStatus.Saving);
        try {
            // Try to save online, if this is not device specific
            if (firestore && this.uid) {
                // Save in firestore
                setDoc(
                    doc(firestore, 'users', this.uid),
                    this.settingsDB.toObject()
                );
            }

            this.setStatus(SaveStatus.Saved);
        } catch (_) {
            this.setStatus(SaveStatus.Error);
        }
    }

    /** Persist in storage */
    async persistProjects() {
        // First, try to save locally
        if ('indexedDB' in window) {
            this.setStatus(SaveStatus.Saving);
            try {
                this.projectsDB.saveProjects(this.toProjectsObject());
            } catch (_) {
                this.setStatus(SaveStatus.Error);
            }
        } else {
            this.setStatus(SaveStatus.Error);
        }

        // Then, try to save them in Firebase if we have a user ID.
        if (firestore && this.uid) {
            try {
                // Create a batch of all of the new and updated projects.
                const batch = writeBatch(firestore);
                this.editableProjects.forEach((history) => {
                    if (
                        firestore &&
                        history.isUnsaved() &&
                        history.isPersisted()
                    ) {
                        const current = history.getCurrent();
                        batch.set(
                            doc(firestore, 'projects', current.id),
                            (this.uid
                                ? current.withUser(this.uid)
                                : current
                            ).serialize()
                        );
                    }
                });

                await batch.commit();

                // Mark all projects saved if successful.
                this.editableProjects.forEach((project) => project.markSaved());
            } catch (error) {
                if (error instanceof FirebaseError) {
                    console.error(error.code);
                    console.error(error.message);
                }
                this.setStatus(SaveStatus.Error);
            }
            this.setStatus(SaveStatus.Saved);
        } else {
            this.setStatus(SaveStatus.Saved);
        }
    }

    async updateProjects(serializedProjects: SerializedProject[]) {
        // Load all of the projects and their locale dependencies.
        const projects = (
            await Promise.all(
                serializedProjects.map((project) =>
                    this.deserializeProject(project)
                )
            )
        ).filter((project): project is Project => project !== undefined);

        // Update the project's store.
        this.editableProjectsStore.set(projects);

        // Set the projects that were able to be loaded.
        this.setProjects(projects);
    }

    async deserializeProject(
        project: SerializedProject
    ): Promise<Project | undefined> {
        const sources = project.sources.map((source) =>
            Project.sourceToSource(source)
        );

        // Get all of the locales on which the project depends.
        const dependentLocales = await this.localesDB.loadLocales(
            getBestSupportedLocales(project.locales)
        );

        const locales = Array.from(
            new Set([...dependentLocales, ...this.localesDB.getLocales()])
        );

        return new Project(
            project.id,
            project.name,
            sources[0],
            sources.slice(1),
            locales,
            project.uids,
            project.sources.map((s, index) => {
                return { source: sources[index], caret: s.caret };
            }),
            project.listed
        );
    }

    /** Start listening tothe Firebase Auth user changes */
    login(callback: (use: User | null) => void) {
        if (auth === undefined) return;
        // Keep the user store in sync.
        this.authUnsubscribe = onAuthStateChanged(auth, async (newUser) => {
            callback(newUser);
            // Update the Projects with the new user, syncing with the database.
            this.updateUser(newUser ? newUser.uid : null);
        });
    }

    /** Start a realtime database query on this user's projects, updating them whenever they change. */
    async updateUser(uid: string | null) {
        if (firestore === undefined) return;

        // Unsubscribe from the old user
        if (this.projectsQueryUnsubscribe) this.projectsQueryUnsubscribe();

        // Update the user ID
        this.uid = uid;

        // Save whatever's in local storage.
        this.persistProjects();

        // Any time the user projects changes in the database, update projects.
        this.projectsQueryUnsubscribe =
            uid === null
                ? undefined
                : onSnapshot(
                      query(
                          collection(firestore, 'projects'),
                          where('uids', 'array-contains', uid)
                      ),
                      (snapshot) => {
                          const projects: SerializedProject[] = [];
                          snapshot.forEach((project) => {
                              projects.push(
                                  project.data() as SerializedProject
                              );
                          });
                          this.updateProjects(projects);
                      },
                      (error) => {
                          if (error instanceof FirebaseError) {
                              console.error(error.code);
                              console.error(error.message);
                          }
                          this.setStatus(SaveStatus.Error);
                      }
                  );

        // Immediately get the config from the database
        if (this.uid) {
            const config = await getDoc(doc(firestore, 'users', this.uid));
            if (config.exists()) {
                const data = config.data();
                // Copy each key/value pair from the database to memory and the local store.
                for (const key in data) {
                    if (key in this.settingsDB.settings) {
                        const value = data[key];
                        (
                            this.settingsDB.settings as Record<
                                string,
                                Setting<unknown>
                            >
                        )[key].set(this, value);
                    }
                }
            }
        }
    }

    /** Clean up listeners */
    clean() {
        if (this.projectsQueryUnsubscribe) this.projectsQueryUnsubscribe();
        if (this.authUnsubscribe) this.authUnsubscribe();
    }
}

export const DefaultLocale = en as Locale;

const browserLanguages =
    typeof navigator !== 'undefined' ? navigator.languages : [];

const IndexedDBSupported =
    typeof window !== 'undefined' && 'indexedDB' in window;

export const DB = new Database(
    getBestSupportedLocales(browserLanguages.slice()),
    DefaultLocale
);

export const Settings = DB.settingsDB;

export const animationFactor = Settings.settings.animationFactor.value;
export const animationDuration = Settings.animationDuration;
export const tutorialProgress = Settings.settings.tutorial.value;
export const arrangement = Settings.settings.arrangement.value;
export const locale = DB.localesDB.locale;
export const locales = DB.localesDB.locales;
export const languages = DB.localesDB.languages;
export const writingDirection = DB.localesDB.writingDirection;
export const writingLayout = Settings.settings.writingLayout.value;
export const camera = Settings.settings.camera.value;
export const mic = Settings.settings.mic.value;
export const status = DB.statusStore;
export const editableProjects = DB.editableProjectsStore;

if (import.meta.hot) {
    import.meta.hot.on('locales-update', () => {
        DB.localesDB.refreshLocales();
    });
}
