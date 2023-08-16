import Project, { type SerializedProject } from '@models/Project';
import type Node from '@nodes/Node';
import { get, writable, type Writable, derived } from 'svelte/store';
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
import { getLanguageDirection } from '../locale/LanguageCode';
import type Progress from '../tutorial/Progress';
import type Arrangement from './Arrangement';
import { Basis } from '../basis/Basis';
import en from '../locale/en-US.json';
import Layout from '../components/project/Layout';
import {
    SupportedLocales,
    type SupportedLocale,
    getBestSupportedLocales,
} from '../locale/Locale';
import type { WritingLayout } from '../locale/Scripts';
import Fonts from '../basis/Fonts';
import type Setting from './Setting';
import { LayoutsSetting } from './LayoutsSetting';
import { ArrangementSetting } from './ArrangementSetting';
import { AnimationFactorSetting } from './AnimationFactorSetting';
import { LocalesSetting } from './LocalesSetting';
import { WritingLayoutSetting } from './WritingLayoutSetting';
import { TutorialProgressSetting } from './TutorialProgressSetting';
import { CameraSetting } from './CameraSetting';
import { MicSetting } from './MicSetting';
import { ProjectsDatabase } from './ProjectsDatabase';
import { ProjectHistory } from './ProjectHistory';

export enum SaveStatus {
    Saved = 'saved',
    Saving = 'saving',
    Error = 'error',
}

export class Database {
    /** The default locale */
    private readonly defaultLocale: Locale;

    /** The status of persisting the projects. */
    readonly statusStore: Writable<SaveStatus> = writable(SaveStatus.Saved);

    /** The current Firebase user ID */
    private uid: string | null = null;

    /** The current settings */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly settings = {
        layouts: LayoutsSetting,
        arrangement: ArrangementSetting,
        animationFactor: AnimationFactorSetting,
        locales: LocalesSetting,
        writingLayout: WritingLayoutSetting,
        tutorial: TutorialProgressSetting,
        camera: CameraSetting,
        mic: MicSetting,
    };

    /** A derived store based on animation factor */
    readonly animationDuration = derived(
        this.settings.animationFactor.value,
        (factor) => factor * 200
    );

    /** Derived stores based on selected locales. */
    readonly locales: Writable<Locale[]> = writable([DefaultLocale]);
    readonly locale = derived(this.locales, ($locales) => $locales[0]);
    readonly languages = derived(this.locales, ($locales) =>
        $locales.map((locale) => locale.language)
    );
    readonly writingDirection = derived(this.locales, ($locales) =>
        getLanguageDirection($locales[0].language)
    );

    /** The locales loaded, loading, or failed to load. */
    private localesLoaded: Record<
        SupportedLocale,
        Locale | Promise<Locale | undefined> | undefined
    > = {} as Record<
        SupportedLocale,
        Locale | Promise<Locale | undefined> | undefined
    >;

    /** The current set of projects in memory. Backed by the IndexedDB local database and Firebase. */
    private projects: Map<string, ProjectHistory>;

    /** An IndexedDB backed database of projects, allowing for scalability of local persistence. */
    readonly projectsDB = new ProjectsDatabase();

    /** Debounce timer, used to clear pending requests. */
    private timer: NodeJS.Timer | undefined = undefined;

    /** Realtime query unsubscribers */
    private authUnsubscribe: Unsubscribe | undefined = undefined;
    private projectsQueryUnsubscribe: Unsubscribe | undefined = undefined;

    constructor(locales: SupportedLocale[], defaultLocale: Locale) {
        this.defaultLocale = defaultLocale;

        // Store the default locale
        this.localesLoaded[
            `${defaultLocale.language}-${defaultLocale.region}` as SupportedLocale
        ] = defaultLocale;

        // Initialize default languages
        if (locales.length > 0) this.settings.locales.set(this, locales);

        // Initialize the in-memory project store from the local database.
        this.projects = new Map();
        this.loadProjects();
    }

    async refreshLocales() {
        this.loadLocales(SupportedLocales.slice(), true);
    }

    async loadLocales(
        preferredLocales: SupportedLocale[],
        refresh = false
    ): Promise<Locale[]> {
        // Asynchronously load all unloaded locales.
        const locales = (
            await Promise.all(
                preferredLocales.map(async (locale) =>
                    this.loadLocale(locale, refresh)
                )
            )
        ).filter((locale): locale is Locale => locale !== undefined);

        // Ask fonts to load the locale's preferred fonts.
        Fonts.loadLocales(locales);

        // Update the locales stores
        this.locales.set(
            this.settings.locales
                .get()
                .map((l) => this.localesLoaded[l])
                .filter(
                    (l): l is Locale =>
                        l !== undefined && !(l instanceof Promise)
                )
        );

        return locales;
    }

    async loadLocale(
        lang: SupportedLocale,
        refresh: boolean
    ): Promise<Locale | undefined> {
        // Already checked and it doesn't exist? Just return undefined.
        if (
            !refresh &&
            Object.hasOwn(this.localesLoaded, lang) &&
            this.localesLoaded[lang] === undefined
        )
            return undefined;

        const current = this.localesLoaded[lang];

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
                this.localesLoaded[lang] = promise;
                const locale = await promise;
                this.localesLoaded[lang] = locale;
                return locale;
            } catch (_) {
                this.localesLoaded[lang] = undefined;
                return undefined;
            }
        } else return current;
    }

    getProjectLayout(id: string) {
        const layouts = this.settings.layouts.get();
        const layout = layouts ? layouts[id] : null;
        return layout ? Layout.fromObject(layout) : null;
    }

    setProjectLayout(id: string, layout: Layout) {
        // Has the layout changed?
        const currentLayoutObject = this.settings.layouts.get()[id] ?? null;
        const currentLayout = currentLayoutObject
            ? Layout.fromObject(currentLayoutObject)
            : null;
        if (currentLayout !== null && currentLayout.isEqualTo(layout)) return;

        const newLayout = Object.fromEntries(
            Object.entries(this.settings.layouts.get())
        );
        newLayout[id] = layout.toObject();
        this.setLayout(newLayout);
    }

    setLayout(layouts: Record<string, LayoutObject>) {
        this.settings.layouts.set(database, layouts);
    }

    getArrangement(): Arrangement {
        return this.settings.arrangement.get();
    }

    setArrangement(arrangement: Arrangement) {
        this.settings.arrangement.set(this, arrangement);
    }

    getAnimationFactor(): number {
        return this.settings.animationFactor.get();
    }

    setAnimationFactor(factor: number) {
        this.settings.animationFactor.set(this, factor);
    }

    getAnimationDuration() {
        return get(this.animationDuration);
    }

    getLanguages(): LanguageCode[] {
        return this.getLocales().map((locale) => locale.language);
    }

    getMissingLanguages() {
        return [];
    }

    getLocales(): Locale[] {
        // Map preferred languages into locales, filtering out missing locales.
        const locales = this.settings.locales
            .get()
            .map((locale) => this.localesLoaded[locale])
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
        this.settings.locales.set(this, preferredLocales);

        // Try to load locales for the requested languages
        const locales = await this.loadLocales(preferredLocales);

        // Revise all projects to have the new locale
        for (const [, history] of this.projects) history.withLocales(locales);
    }

    getWritingDirection() {
        return get(this.writingDirection);
    }

    getWritingLayout(): WritingLayout {
        return this.settings.writingLayout.get();
    }

    setWritingLayout(layout: WritingLayout) {
        this.settings.writingLayout.set(this, layout);
    }

    setTutorialProgress(progress: Progress) {
        this.settings.tutorial.set(this, progress.seralize());
    }

    setCamera(deviceID: string | null) {
        this.settings.camera.set(this, deviceID);
    }

    getCamera() {
        return this.settings.camera.get();
    }

    setMic(deviceID: string | null) {
        this.settings.mic.set(this, deviceID);
    }

    getMic() {
        return this.settings.mic.get();
    }

    getProjectStore(id: string) {
        return this.projects.get(id)?.getStore();
    }

    /** Get a list of all current projects */
    async getAllCreatorProjects(): Promise<Project[]> {
        await this.loadProjects();
        return Array.from(this.projects.values()).map((p) => p.getCurrent());
    }

    /** Returns the current version of the project with the given ID, if it exists. */
    async getProject(id: string): Promise<Project | undefined> {
        // First, check memory.
        const project = this.projects.get(id)?.getCurrent();
        if (project !== undefined) return project;

        // Not there? Check the local database.
        if (IndexedDBSupported) {
            const localProject = await this.projectsDB.get(id);
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
            const projects = await this.projectsDB.all();
            this.updateProjects(projects);
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
            undefined,
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
        let history = this.projects.get(project.id);
        if (history) history.edit(project, remember);
        else {
            history = new ProjectHistory(project);
            this.projects.set(project.id, history);
        }

        // Defer a save.
        if (persist) this.requestProjectsSave();

        return history;
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
        return this.projects.get(id);
    }

    undoRedoProject(id: string, direction: -1 | 1): Project | undefined {
        const history = this.projects.get(id);
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
        return Array.from(this.projects.values()).map((history) =>
            history.getCurrent().serialize()
        );
    }

    /** Saves settings to Firebase, if available. */
    persistSettings() {
        this.setStatus(SaveStatus.Saving);
        try {
            // Try to save online, if this is not device specific
            if (firestore && this.uid) {
                // Get the config, but delete all device-specific configs.
                const settings: Record<string, unknown> = {};
                for (const [key, setting] of Object.entries(this.settings)) {
                    const value = setting.get();
                    if (value !== null) settings[key] = value;
                }

                // Save in firestore
                setDoc(doc(firestore, 'users', this.uid), settings);
            }

            this.setStatus(SaveStatus.Saved);
        } catch (_) {
            this.setStatus(SaveStatus.Error);
        }
    }

    /** Persist in storage */
    async persistProjects() {
        if ('indexedDB' in window) {
            // First, try to save locally
            this.setStatus(SaveStatus.Saving);
            try {
                this.projectsDB.save(this.toProjectsObject());
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
                this.projects.forEach((history) => {
                    if (firestore && history.isUnsaved()) {
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
                this.projects.forEach((project) => project.markSaved());
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
                    if (key in this.settings) {
                        const value = data[key];
                        (this.settings as Record<string, Setting<unknown>>)[
                            key
                        ].set(this, value);
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

export const database = new Database(
    getBestSupportedLocales(browserLanguages.slice()),
    DefaultLocale
);

export const animationFactor = database.settings.animationFactor.value;
export const animationDuration = database.animationDuration;
export const tutorialProgress = database.settings.tutorial.value;
export const arrangement = database.settings.arrangement.value;
export const locale = database.locale;
export const locales = database.locales;
export const languages = database.languages;
export const writingDirection = database.writingDirection;
export const writingLayout = database.settings.writingLayout.value;
export const camera = database.settings.camera.value;
export const mic = database.settings.mic.value;
export const status = database.statusStore;

if (import.meta.hot) {
    import.meta.hot.on('locales-update', () => {
        database.refreshLocales();
    });
}
