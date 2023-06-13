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
import type { LayoutObject } from '../components/project/Layout';
import type LanguageCode from '../locale/LanguageCode';
import { Languages, type WritingLayout } from '../locale/LanguageCode';
import SupportedLocales from '../locale/locales';
import Progress from '../tutorial/Progress';
import type { Act } from '../locale/Locale';

const PROJECTS_KEY = 'projects';
const LAYOUTS_KEY = 'layouts';
const ANIMATION_FACTOR_KEY = 'animationFactor';
const LANGUAGES_KEY = 'languages';
const WRITING_LAYOUT_KEY = 'writingLayout';
const TUTORIAL_KEY = 'tutorial';

const deviceSpecific: Record<keyof CreatorConfig, boolean> = {
    layouts: true,
    animationFactor: false,
    languages: false,
    writingLayout: false,
    tutorial: false,
};

const ANIMATION_DURATION = 200;

// Remember this many project edits.
const PROJECT_HISTORY_LIMIT = 128;

export enum SaveStatus {
    Saved = 'saved',
    Saving = 'saving',
    Error = 'error',
}

export type TutorialProgress = {
    act: number;
    scene: number;
    line: number;
};

const TutorialDefault = { act: 1, scene: 1, line: 1 };

type CreatorConfig = {
    layouts: Record<string, LayoutObject>;
    animationFactor: number;
    languages: LanguageCode[];
    writingLayout: WritingLayout;
    tutorial: TutorialProgress;
};

function setLocalValue(key: string, value: any) {
    if (typeof window !== 'undefined') {
        if (value === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, JSON.stringify(value));
    }
}

function getLocalValue<Type>(key: string): Type | null {
    const value =
        typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    return value === null ? null : (JSON.parse(value) as Type);
}

export class Creator {
    /** A Svelte store for that contains this. Updated when config changes. */
    private configStore: Writable<Creator>;

    /** A Svelte store for that contains this. Updated when projects change. */
    private projectsStore: Writable<Creator>;

    /** The current user ID */
    private uid: string | null = null;

    /** The current creator configuration */
    private config: CreatorConfig = {
        layouts: {},
        animationFactor: 1,
        languages: ['en'],
        writingLayout: 'horizontal-tb',
        tutorial: TutorialDefault,
    };

    /** The current list of projects. */
    private projects: Map<
        string,
        {
            // The current version of the project
            current: Project;
            // Previous versions of the project.
            // It always contains the current version of the project and is therefore never empty.
            history: [Project, ...Project[]];
            // The index of the current project in the history.
            // The present is the last value in the history.
            index: number;
            // True if this was successfully saved in the remote database.
            saved: boolean;
        }
    >;

    /** The status of persisting the projects. */
    private status: SaveStatus = SaveStatus.Saved;

    /** Debounce timer, used to clear pending requests. */
    private timer: NodeJS.Timer | undefined = undefined;

    /** Realtime query unsubscribers */
    private authUnsubscribe: Unsubscribe | undefined = undefined;
    private projectsQueryUnsubscribe: Unsubscribe | undefined = undefined;

    constructor() {
        this.projects = new Map();
        this.configStore = writable(this);
        this.projectsStore = writable(this);
    }

    getLayout() {
        return this.config.layouts;
    }

    setLayout(layouts: Record<string, LayoutObject>) {
        if (this.config.layouts === layouts) return;
        this.config.layouts = layouts;
        this.saveConfig(LAYOUTS_KEY, layouts);
    }

    getAnimationFactor() {
        return this.config.animationFactor;
    }

    getAnimationDuration() {
        return this.getAnimationFactor() * ANIMATION_DURATION;
    }

    setAnimationFactor(factor: number) {
        if (this.config.animationFactor === factor) return;
        this.config.animationFactor = factor;
        return this.saveConfig(ANIMATION_FACTOR_KEY, factor);
    }

    getLanguages() {
        return this.config.languages;
    }

    getMissingLanguages() {
        return this.getLanguages().filter(
            (lang) => !SupportedLocales.some((trans) => trans.language === lang)
        );
    }

    getLocales() {
        // Map preferred languages into translations, filtering out missing translations.
        const languages = this.getLanguages();

        const translations: Locale[] = languages
            .map((lang) => {
                const translationsInLanguage = SupportedLocales.filter(
                    (translation) => translation.language === lang
                );
                return translationsInLanguage[0] ?? undefined;
            })
            .filter((trans): trans is Locale => trans !== undefined);

        return translations.length === 0 ? [SupportedLocales[0]] : translations;
    }

    getLocale() {
        return this.getLocales()[0];
    }

    setLanguages(languages: LanguageCode[]) {
        this.config.languages = languages;
        this.saveConfig(LANGUAGES_KEY, languages);
    }

    getWritingDirection() {
        return Languages[this.getLanguages()[0]].direction ?? 'ltr';
    }

    getWritingLayout() {
        return this.config.writingLayout;
    }

    setWritingLayout(layout: WritingLayout) {
        if (this.config.writingLayout === layout) return;
        this.config.writingLayout = layout;
        this.saveConfig(WRITING_LAYOUT_KEY, layout);
    }

    setTutorialProgress(progress: Progress) {
        const value = progress.toObject();
        if (
            value.act === this.config.tutorial.act &&
            value.scene === this.config.tutorial.scene &&
            value.line === this.config.tutorial.line
        )
            return;

        this.config.tutorial = value;
        this.saveConfig(TUTORIAL_KEY, value);
    }

    getTutorialProgress(tutorial: Act[]) {
        return new Progress(
            tutorial,
            this.config.tutorial.act,
            this.config.tutorial.scene,
            this.config.tutorial.line
        );
    }

    getSaveStatus() {
        return this.status;
    }

    getConfigStore() {
        return this.configStore;
    }

    getProjectsStore() {
        return this.projectsStore;
    }

    /** Get a list of all current projects */
    getCurrentProjects() {
        return Array.from(this.projects.values()).map((p) => p.current);
    }

    /** Returns the current version of the project with the given ID, if it exists. */
    getProject(id: string) {
        return this.projects.get(id)?.current;
    }

    async loadProject(projectID: string): Promise<Project | undefined> {
        // If we don't have it, ask the database for it.
        try {
            const projectDoc = await getDoc(
                doc(firestore, 'projects', projectID)
            );
            if (projectDoc.exists()) {
                const project = Project.fromObject(
                    projectDoc.data() as SerializedProject
                );
                this.addProject(project);
                return project;
            }
        } catch (err) {
            return undefined;
        }
    }

    /** Create a project and return it's ID */
    createProject(translation: Locale, uid: string | undefined) {
        const newProject = new Project(
            null,
            '',
            new Source(translation.terminology.start, ''),
            [],
            undefined,
            uid ? [uid] : []
        );
        this.addProject(newProject);
        return newProject.id;
    }

    /** Batch set projects */
    setProjects(projects: Project[], persist: boolean = true) {
        for (const project of projects) {
            // See if there's an existing record for this project
            // so we can preserve it's history.
            const info = this.projects.get(project.id);

            this.projects.set(project.id, {
                current: project,
                history: info ? info.history : [project],
                index: info ? info.index : 0,
                saved: false,
            });
        }
        if (persist) this.requestProjectsSave();
    }

    /** Add a single project, overriding any project with it's ID. */
    addProject(project: Project) {
        this.setProjects([project]);
    }

    /** Delete the project with the given ID, if it exists */
    async deleteProject(id: string) {
        this.projects.delete(id);
        this.requestProjectsSave();
        if (this.uid) {
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

    /** Replaces the project with the given project, adding the current version to the history, and erasing the future, if there is any. */
    reviseProject(project: string | Project, revised: Project) {
        // Find the ID we're revising.
        const id = project instanceof Project ? project.id : project;

        // Get the info for the project. Bail if we don't find it, since this should never happen.
        const info = this.projects.get(id);
        if (info === undefined) throw Error(`Couldn't find project ID ${id}`);

        // Is the undo pointer before the end? Trim the future.
        info.history.splice(info.index, info.history.length - info.index - 1);

        // Is the length of the history great than the limit? Trim it.
        if (info.history.length > PROJECT_HISTORY_LIMIT)
            info.history.splice(0, PROJECT_HISTORY_LIMIT - info.history.length);

        // Add the revised project to the history.
        info.history.push(revised);

        // Reset the pointer to the end of the history
        info.index = info.history.length;

        // Set the current project to the revised project.
        info.current = revised;

        // Mark unsaved
        info.saved = false;

        // Request a save.
        this.requestProjectsSave();
    }

    undoProject(id: string) {
        this.undoRedoProject(id, -1);
    }

    redoProject(id: string) {
        this.undoRedoProject(id, 1);
    }

    undoRedoProject(id: string, direction: -1 | 1) {
        const info = this.projects.get(id);
        // No record of this project? Do nothing.
        if (info === undefined) return;

        // In the present? Do nothing.
        if (direction > 0 && info.index === info.history.length - 1) return;
        // No more history? Do nothing.
        else if (direction < 0 && info.index === 0) return;

        // Move the index back a step in time
        info.index += direction;

        // Change the current project to the historical project.
        info.current = info.history[info.index];

        this.requestProjectsSave();
    }

    /** Shorthand for revising nodes in a project */
    reviseProjectNodes(
        project: Project,
        revisions: [Node, Node | undefined][]
    ) {
        this.reviseProject(project, project.withRevisedNodes(revisions));
    }

    /**
     * Trigger a save to local storage and the remote database at some point in the future.
     * Should be called any time this.projects is modified.
     */
    requestProjectsSave() {
        // Broadcast to all listeners.
        this.projectsStore.set(this);

        // Note that we're saving.
        this.setStatus(SaveStatus.Saving);

        // Clear pending saves.
        clearTimeout(this.timer);

        // Initiate another.
        this.timer = setTimeout(() => this.saveProjects(), 1000);
    }

    /** Update the saving status and broadcast via the store. */
    setStatus(status: SaveStatus) {
        this.status = status;

        // Broadcast changes to all listeners.
        this.configStore.set(this);
    }

    /** Convert to an object suitable for JSON serialization */
    toProjectsObject(): SerializedProject[] {
        return Array.from(this.projects.values()).map((project) =>
            project.current.toObject()
        );
    }

    saveConfig(key: keyof CreatorConfig, value: any) {
        // Persist in local storage.
        this.setStatus(SaveStatus.Saving);
        try {
            setLocalValue(key, value);

            // Try to save online, if this is not device specific
            if (!deviceSpecific[key] && this.uid) {
                // Get the config, but delete all device-specific configs.
                const config = { ...this.config };
                for (const key in deviceSpecific) {
                    if (deviceSpecific[key as keyof CreatorConfig] === true)
                        delete config[key as keyof CreatorConfig];
                }

                setDoc(doc(firestore, 'users', this.uid), config);
            }

            this.setStatus(SaveStatus.Saved);
        } catch (_) {
            this.setStatus(SaveStatus.Error);
        }
    }

    /** Persist in storage */
    async saveProjects() {
        // First, cache the projects to local storage.
        this.setStatus(SaveStatus.Saving);
        try {
            setLocalValue(PROJECTS_KEY, this.toProjectsObject());
            this.setStatus(SaveStatus.Saved);
        } catch (_) {
            this.setStatus(SaveStatus.Error);
        }

        // Then, try to save them in Firebase if we have a user ID.
        if (this.uid) {
            try {
                // Create a batch of all of the new and updated projects.
                const batch = writeBatch(firestore);
                this.projects.forEach((project) => {
                    if (!project.saved)
                        batch.set(
                            doc(firestore, 'projects', project.current.id),
                            (this.uid
                                ? project.current.withUser(this.uid)
                                : project.current
                            ).toObject()
                        );
                });

                await batch.commit();

                // Mark all projects saved if successful.
                this.projects.forEach((project) => (project.saved = true));
            } catch (error) {
                if (error instanceof FirebaseError) {
                    console.error(error.code);
                    console.error(error.message);
                }
                this.setStatus(SaveStatus.Error);
            }
        }
    }

    /** Load from local browser storage */
    loadLocal() {
        const data = getLocalValue<SerializedProject[]>(PROJECTS_KEY);
        if (data)
            this.setProjects(
                data.map((project) => Project.fromObject(project))
            );

        this.config.layouts =
            getLocalValue<Record<string, LayoutObject>>(LAYOUTS_KEY) ?? {};

        const persisted = getLocalValue(ANIMATION_FACTOR_KEY);
        this.config.animationFactor =
            persisted === true ||
            persisted === null ||
            !(typeof persisted === 'number')
                ? 1
                : Math.min(4, Math.max(0, persisted));

        this.config.languages = getLocalValue<string[]>(LANGUAGES_KEY) ?? [
            'en',
        ];

        this.config.writingLayout =
            getLocalValue<WritingLayout>(WRITING_LAYOUT_KEY) ?? 'horizontal-tb';

        this.config.tutorial =
            getLocalValue<TutorialProgress>(TUTORIAL_KEY) ?? TutorialDefault;
    }

    /** Start listening tothe Firebase Auth user changes */
    login(callback: (use: User | null) => void) {
        // Keep the user store in sync.
        this.authUnsubscribe = onAuthStateChanged(auth, async (newUser) => {
            callback(newUser);
            // Update the Projects with the new user, syncing with the database.
            this.updateUser(newUser ? newUser.uid : null);
        });
    }

    /** Start a realtime database query on this user's projects, updating them whenever they change. */
    async updateUser(uid: string | null) {
        // Unsubscribe from the old user
        if (this.projectsQueryUnsubscribe) this.projectsQueryUnsubscribe();

        // Update the user ID
        this.uid = uid;

        // Save whatever's in local storage.
        this.saveProjects();

        // Any time the user projects changes, update projects.
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
                          this.setProjects(
                              projects.map((project) =>
                                  Project.fromObject(project)
                              ),
                              false
                          );
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
            try {
                const config = await getDoc(doc(firestore, 'users', this.uid));
                if (config.exists()) {
                    const data = config.data();
                    // Copy each key/value pair from the database to memory and the local store.
                    for (const key in data) {
                        if (key in this.config) {
                            (this.config as Record<string, any>)[key] =
                                data[key];
                            setLocalValue(key, data[key]);
                        }
                    }
                    // Update the config store.
                    this.configStore.set(this);
                }
            } catch (_) {}
        }
    }

    /** Clean up listeners */
    clean() {
        if (this.projectsQueryUnsubscribe) this.projectsQueryUnsubscribe();
        if (this.authUnsubscribe) this.authUnsubscribe();
    }
}

const db = new Creator();
export const creator = db.getConfigStore();
export const projects = db.getProjectsStore();
