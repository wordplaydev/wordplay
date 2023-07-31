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
import {
    getLanguageDirection,
    type WritingLayout,
} from '../locale/LanguageCode';
import Progress from '../tutorial/Progress';
import Arrangement from './Arrangement';
import type { Tutorial } from '../tutorial/Tutorial';
import { Basis } from '../basis/Basis';
import en from '../locale/en-US.json';
import Layout from '../components/project/Layout';
import {
    SupportedLocales,
    type SupportedLocale,
    getBestSupportedLocales,
} from '../locale/Locale';

const PROJECTS_KEY = 'projects';
const LAYOUTS_KEY = 'layouts';
const ARRANGEMENT_KEY = 'arrangement';
const ANIMATION_FACTOR_KEY = 'animationFactor';
const LOCALES_KEY = 'locales';
const WRITING_LAYOUT_KEY = 'writingLayout';
const TUTORIAL_KEY = 'tutorial';

/** If true, we only persist on the device, and not in the database. */
const deviceSpecific: Record<keyof CreatorConfig, boolean> = {
    layouts: true,
    arrangement: true,
    animationFactor: false,
    locales: false,
    writingLayout: false,
    tutorial: false,
};

const ANIMATION_DURATION = 200;

// Remember this many project edits.
const PROJECT_HISTORY_LIMIT = 1000;

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
    arrangement: Arrangement;
    animationFactor: number;
    locales: SupportedLocale[];
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
    /** The default locale */
    private readonly defaultLocale: Locale;

    /** A Svelte store for that contains this. Updated when config changes. */
    private configStore: Writable<Creator>;

    /** A Svelte store for that contains this. Updated when projects change. */
    private projectsStore: Writable<Creator>;

    /** The status of persisting the projects. */
    private statusStore: Writable<SaveStatus> = writable(SaveStatus.Saved);

    /** The current Firebase user ID */
    private uid: string | null = null;

    /** The current creator configuration */
    private config: CreatorConfig = {
        layouts: {},
        arrangement: Arrangement.Vertical,
        animationFactor: 1,
        locales: ['en-US'],
        writingLayout: 'horizontal-tb',
        tutorial: TutorialDefault,
    };

    /** The locales loaded. Undefined if the language code doesn't exist. */
    private locales: Record<
        SupportedLocale,
        Locale | Promise<Locale | undefined> | undefined
    > = {} as Record<
        SupportedLocale,
        Locale | Promise<Locale | undefined> | undefined
    >;

    /** The current list of projects. */
    private projects: Map<
        string,
        {
            // The current version of the project
            current: Project;
            // Previous versions of the project.
            // It always contains the current version of the project and is therefore never empty.
            // There is one history for the entire project; no per-source history.
            // History is not persisted, it's session-only.
            history: [Project, ...Project[]];
            // The index of the current project in the history.
            // The present is the last value in the history.
            index: number;
            // True if this was successfully saved in the remote database.
            saved: boolean;
        }
    >;

    /** Debounce timer, used to clear pending requests. */
    private timer: NodeJS.Timer | undefined = undefined;

    /** Realtime query unsubscribers */
    private authUnsubscribe: Unsubscribe | undefined = undefined;
    private projectsQueryUnsubscribe: Unsubscribe | undefined = undefined;

    constructor(locales: SupportedLocale[], defaultLocale: Locale) {
        this.defaultLocale = defaultLocale;
        this.projects = new Map();

        this.configStore = writable(this);
        this.projectsStore = writable(this);

        // Store the default locale
        this.locales[
            `${defaultLocale.language}-${defaultLocale.region}` as SupportedLocale
        ] = defaultLocale;

        // Initialize default languages
        if (locales.length > 0) this.config.locales = locales;

        this.loadLocalData();
    }

    async refreshLocales() {
        this.loadLocales(SupportedLocales.slice(), true);
    }

    async loadLocales(
        preferredLocales: SupportedLocale[],
        refresh: boolean = false
    ): Promise<Locale[]> {
        // Asynchronously load all unloaded
        const locales = (
            await Promise.all(
                preferredLocales.map(async (locale) =>
                    this.loadLocale(locale, refresh)
                )
            )
        ).filter((locale): locale is Locale => locale !== undefined);

        // Notify config listeners.
        this.configStore.set(this);
        return locales;
    }

    async loadLocale(
        lang: SupportedLocale,
        refresh: boolean
    ): Promise<Locale | undefined> {
        if (lang === 'en-US') return en as Locale;

        // Already checked and it doesn't exist? Just return undefined.
        if (
            !refresh &&
            Object.hasOwn(this.locales, lang) &&
            this.locales[lang] === undefined
        )
            return undefined;

        const current = this.locales[lang];

        // Are we in the middle of getting it? Return the promise we already made.
        if (current instanceof Promise) {
            return current;
        }
        // If we don't already have it, make a promise to load it.
        else if (current === undefined || refresh) {
            try {
                const path = `/locales/${lang}/${lang}.json`;
                const promise =
                    // First, see if the locale exists
                    fetch(path)
                        .then(async (response) =>
                            response.ok ? await response.json() : undefined
                        )
                        .catch(() => undefined);
                this.locales[lang] = promise;
                const locale = await promise;
                this.locales[lang] = locale;
                return locale;
            } catch (_) {
                this.locales[lang] = undefined;
                return undefined;
            }
        } else return current;
    }

    getProjectLayout(id: string) {
        const layouts = this.config.layouts;
        const layout = layouts ? layouts[id] : null;
        return layout ? Layout.fromObject(layout) : null;
    }

    setProjectLayout(id: string, layout: Layout) {
        // Has the layout changed?
        const currentLayoutObject = this.config.layouts[id] ?? null;
        const currentLayout = Layout.fromObject(currentLayoutObject);
        if (currentLayout !== null && currentLayout.isEqualTo(layout)) return;

        const newLayout = Object.fromEntries(
            Object.entries(this.config.layouts)
        );
        newLayout[id] = layout.toObject();
        this.setLayout(newLayout);
    }

    setLayout(layouts: Record<string, LayoutObject>) {
        if (this.config.layouts === layouts) return;
        this.config.layouts = layouts;
        this.saveConfig(LAYOUTS_KEY, layouts);
    }

    getArrangement() {
        return this.config.arrangement;
    }

    setArrangement(arrangement: Arrangement) {
        if (this.config.arrangement === arrangement) return;
        this.config.arrangement = arrangement;
        this.saveConfig(ARRANGEMENT_KEY, arrangement);
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

    getLanguages(): LanguageCode[] {
        return this.getLocales().map((locale) => locale.language);
    }

    getMissingLanguages() {
        return [];
    }

    getLocales(): Locale[] {
        // Map preferred languages into locales, filtering out missing locales.
        const locales = this.config.locales
            .map((locale) => this.locales[locale])
            .filter(
                (locale): locale is Locale =>
                    locale !== undefined && !(locale instanceof Promise)
            );
        return locales.length === 0 ? [this.defaultLocale] : locales;
    }

    getLocale(): Locale {
        return this.getLocales()[0];
    }

    getLocaleBasis(): Basis {
        return Basis.getLocalizedBasis(this.getLocales());
    }

    /** Set the languages, load all locales if they aren't loaded, revise all projects to include any new locales, and save the new configuration. */
    async setLocales(preferredLocales: SupportedLocale[]) {
        // Update the configuration with the new languages, regardless of whether we successfully loaded them.
        this.config.locales = preferredLocales;
        this.saveConfig(LOCALES_KEY, preferredLocales);

        // Try to load locales for the requested languages
        const locales = await this.loadLocales(preferredLocales);

        // Revise all projects to have the new locale
        for (const [, project] of this.projects) {
            project.current = project.current.withLocales(locales);
            project.history = project.history.map((proj) =>
                proj.withLocales(locales)
            ) as [Project, ...Project[]];
        }

        this.projectsStore.set(this);
    }

    getWritingDirection() {
        return getLanguageDirection(this.getLanguages()[0]);
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

    getTutorialProgress(tutorial: Tutorial) {
        return new Progress(
            tutorial,
            this.config.tutorial.act,
            this.config.tutorial.scene,
            this.config.tutorial.line
        );
    }

    getSaveStatusStore() {
        return this.statusStore;
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
        if (firestore) {
            try {
                const projectDoc = await getDoc(
                    doc(firestore, 'projects', projectID)
                );
                if (projectDoc.exists()) {
                    const project = await this.deserializeProject(
                        projectDoc.data() as SerializedProject
                    );
                    if (project !== undefined) this.addProject(project);
                    return project;
                }
            } catch (err) {
                return undefined;
            }
        }
    }

    /** Create a project and return it's ID */
    createProject(
        locales: Locale[],
        uid: string | undefined,
        code: string = ''
    ) {
        const newProject = new Project(
            null,
            '',
            new Source(locales[0].term.start, code),
            [],
            // The project starts with all of the locales currently selected in the config.
            locales,
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

    /** Replaces the project with the given project, adding the current version to the history, and erasing the future, if there is any. */
    reviseProject(project: string | Project, revised: Project) {
        // Find the ID we're revising.
        const id = project instanceof Project ? project.id : project;

        // Get the info for the project. Bail if we don't find it, since this should never happen.
        const serialized = this.projects.get(id);

        // Couldn't find it? Add it.
        if (serialized === undefined) {
            this.addProject(revised);
            return;
        }

        // Is the undo pointer before the end? Trim the future, keeping the present intact.
        serialized.history.splice(
            serialized.index + 1,
            serialized.history.length - serialized.index - 1
        );

        // Is the length of the history great than the limit? Trim it.
        if (serialized.history.length > PROJECT_HISTORY_LIMIT)
            serialized.history.splice(
                0,
                PROJECT_HISTORY_LIMIT - serialized.history.length
            );

        // Add the revised project to the history.
        serialized.history.push(revised);

        // Reset the pointer to the end of the history
        serialized.index = serialized.history.length - 1;

        // Set the current project to the revised project.
        serialized.current = revised;

        // Mark unsaved
        serialized.saved = false;

        // Request a save to persist the current version.
        this.requestProjectsSave();
    }

    projectIsUndoable(id: string) {
        const info = this.projects.get(id);
        return info !== undefined && info.index > 0;
    }

    undoProject(id: string) {
        return this.undoRedoProject(id, -1);
    }

    projectIsRedoable(id: string) {
        const info = this.projects.get(id);
        return info !== undefined && info.index < info.history.length - 1;
    }

    redoProject(id: string) {
        return this.undoRedoProject(id, 1);
    }

    undoRedoProject(id: string, direction: -1 | 1): boolean {
        const info = this.projects.get(id);
        // No record of this project? Do nothing.
        if (info === undefined) return false;

        // In the present? Do nothing.
        if (direction > 0 && info.index === info.history.length - 1)
            return false;
        // No more history? Do nothing.
        else if (direction < 0 && info.index === 0) return false;

        // Move the index back a step in time
        info.index += direction;

        // Change the current project to the historical project.
        info.current = info.history[info.index];

        this.requestProjectsSave();

        return true;
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
        this.statusStore.set(status);
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
            if (firestore && !deviceSpecific[key] && this.uid) {
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

        // Notify config listeners.
        this.configStore.set(this);
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
        if (firestore && this.uid) {
            try {
                // Create a batch of all of the new and updated projects.
                const batch = writeBatch(firestore);
                this.projects.forEach((project) => {
                    if (firestore && !project.saved)
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
    loadLocalData() {
        const projects = getLocalValue<SerializedProject[]>(PROJECTS_KEY);
        if (projects) this.updateProjects(projects);

        this.config.arrangement =
            (getLocalValue<string>(ARRANGEMENT_KEY) as Arrangement) ??
            Arrangement.Vertical;

        this.config.layouts =
            getLocalValue<Record<string, LayoutObject>>(LAYOUTS_KEY) ?? {};

        const persisted = getLocalValue(ANIMATION_FACTOR_KEY);
        this.config.animationFactor =
            persisted === true ||
            persisted === null ||
            !(typeof persisted === 'number')
                ? 1
                : Math.min(4, Math.max(0, persisted));

        const locales = getLocalValue<string[]>(LOCALES_KEY);
        this.config.locales =
            locales === null || locales.length === 0
                ? [SupportedLocales[0]]
                : (locales as SupportedLocale[]);

        this.loadLocales(this.config.locales);

        this.config.writingLayout =
            getLocalValue<WritingLayout>(WRITING_LAYOUT_KEY) ?? 'horizontal-tb';

        this.config.tutorial =
            getLocalValue<TutorialProgress>(TUTORIAL_KEY) ?? TutorialDefault;
    }

    async updateProjects(serializedProjects: SerializedProject[]) {
        // Load all of the projects and their locale dependencies.
        const projects = await Promise.all(
            serializedProjects.map((project) =>
                this.deserializeProject(project)
            )
        );

        // Set the projects that were able to be loaded.
        this.setProjects(
            projects.filter(
                (project): project is Project => project !== undefined
            )
        );
    }

    async deserializeProject(
        project: SerializedProject
    ): Promise<Project | undefined> {
        const sources = project.sources.map((source) =>
            Project.sourceToSource(source)
        );

        // Get all of the locales on which the project depends.
        const dependentLocales = await this.loadLocales(
            getBestSupportedLocales(project.locales)
        );

        const locales = Array.from(
            new Set([...dependentLocales, ...this.getLocales()])
        );

        return new Project(
            project.id,
            project.name,
            sources[0],
            sources.slice(1),
            locales,
            project.sources.map((s, index) => {
                return { source: sources[index], caret: s.caret };
            }),
            project.uids,
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
        this.saveProjects();

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

export const DefaultLocale = en as Locale;

const browserLanguages =
    typeof navigator !== 'undefined' ? navigator.languages : [];

const db = new Creator(
    getBestSupportedLocales(browserLanguages.slice()),
    DefaultLocale
);

export const config = db.getConfigStore();
export const projects = db.getProjectsStore();
export const status = db.getSaveStatusStore();

if (import.meta.hot) {
    import.meta.hot.on('locales-update', () => {
        db.refreshLocales();
    });
}
