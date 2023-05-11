import Project, { type SerializedProject } from '@models/Project';
import type Node from '@nodes/Node';
import type { ProjectsContext } from '../components/project/Contexts';
import { writable } from 'svelte/store';
import { getPersistedValue, setPersistedValue } from '@db/persist';
import Source from '@nodes/Source';
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    onSnapshot,
    query,
    where,
    writeBatch,
} from 'firebase/firestore';
import { firestore } from './firebase';
import type { Unsubscribe } from 'firebase/auth';
import type Locale from '../translation/Locale';
import { FirebaseError } from 'firebase/app';

const LOCAL_STORAGE_KEY = 'projects';

// Remember this many project edits.
const HISTORY_LIMIT = 128;

export enum Status {
    Saved = 'saved',
    Saving = 'saving',
    Error = 'error',
}

export default class Projects {
    /** A Svelte store for that contains this. */
    private store: ProjectsContext;

    /** The current user ID */
    private uid: string | null = null;

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
    private status: Status = Status.Saved;

    /** Debounce timer, used to clear pending requests. */
    private timer: NodeJS.Timer | undefined = undefined;

    /** Realtime query unsubscriber */
    private unsubscribe: Unsubscribe | undefined = undefined;

    constructor() {
        this.projects = new Map();
        this.store = writable(this);
    }

    getStore() {
        return this.store;
    }

    getStatus() {
        return this.status;
    }

    /** Get a list of all current projects */
    all() {
        return Array.from(this.projects.values()).map((p) => p.current);
    }

    /** Returns the current version of the project with the given ID, if it exists. */
    get(id: string) {
        return this.projects.get(id)?.current;
    }

    async load(projectID: string): Promise<Project | undefined> {
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
    create(translation: Locale, uid: string | undefined) {
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
        if (persist) this.update();
    }

    /** Add a single project, overriding any project with it's ID. */
    addProject(project: Project) {
        this.setProjects([project]);
    }

    /** Delete the project with the given ID, if it exists */
    async delete(id: string) {
        this.projects.delete(id);
        this.update();
        if (this.uid) {
            try {
                await deleteDoc(doc(firestore, 'projects', id));
            } catch (error) {
                if (error instanceof FirebaseError) {
                    console.error(error.code);
                    console.error(error.message);
                }
                this.setStatus(Status.Error);
            }
        }
    }

    /** Replaces the project with the given project, adding the current version to the history, and erasing the future, if there is any. */
    revise(project: string | Project, revised: Project) {
        // Find the ID we're revising.
        const id = project instanceof Project ? project.id : project;

        // Get the info for the project. Bail if we don't find it, since this should never happen.
        const info = this.projects.get(id);
        if (info === undefined) throw Error(`Couldn't find project ID ${id}`);

        // Is the undo pointer before the end? Trim the future.
        info.history.splice(info.index, info.history.length - info.index - 1);

        // Is the length of the history great than the limit? Trim it.
        if (info.history.length > HISTORY_LIMIT)
            info.history.splice(0, HISTORY_LIMIT - info.history.length);

        // Add the revised project to the history.
        info.history.push(revised);

        // Reset the pointer to the end of the history
        info.index = info.history.length;

        // Set the current project to the revised project.
        info.current = revised;

        // Mark unsaved
        info.saved = false;

        // Request a save.
        this.update();
    }

    undo(id: string) {
        this.travel(id, -1);
    }

    redo(id: string) {
        this.travel(id, 1);
    }

    travel(id: string, direction: -1 | 1) {
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

        this.update();
    }

    /** Shorthand for revising nodes in a project */
    reviseNodes(project: Project, revisions: [Node, Node | undefined][]) {
        this.revise(project, project.withRevisedNodes(revisions));
    }

    /**
     * Trigger a save to local storage and the remote database at some point in the future.
     * Should be called any time this.projects is modified.
     */
    update() {
        // Note that we're saving.
        this.setStatus(Status.Saving);

        // Notify subscribers
        this.store.set(this);

        // Clear pending saves.
        clearTimeout(this.timer);

        // Initiate another.
        this.timer = setTimeout(() => this.save(), 1000);
    }

    /** Update the saving status and broadcast via the store. */
    setStatus(status: Status) {
        this.status = status;
        this.store.set(this);
    }

    /** Convert to an object suitable for JSON serialization */
    toObject(): SerializedProject[] {
        return Array.from(this.projects.values()).map((project) =>
            project.current.toObject()
        );
    }

    /** Persist in storage */
    async save() {
        // First, cache the projects to local storage.
        this.setStatus(Status.Saving);
        try {
            setPersistedValue(LOCAL_STORAGE_KEY, this.toObject());
            this.setStatus(Status.Saved);
        } catch (_) {
            this.setStatus(Status.Error);
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
                this.setStatus(Status.Error);
            }
        }
    }

    /** Load from local browser storage */
    loadLocal() {
        const data = getPersistedValue<SerializedProject[]>(LOCAL_STORAGE_KEY);
        if (data)
            this.setProjects(
                data.map((project) => Project.fromObject(project))
            );
    }

    /** Start a realtime database query on this user's projects, updating them whenever they change. */
    async updateUser(uid: string | null) {
        // Unsubscribe from the old user
        if (this.unsubscribe) this.unsubscribe();

        // Update the user ID
        this.uid = uid;

        // Save whatever's in local storage.
        this.save();

        // Any time the user projects changes, update projects.
        this.unsubscribe =
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
                          this.setStatus(Status.Error);
                      }
                  );
    }

    /** Clean up listeners */
    clean() {
        if (this.unsubscribe) this.unsubscribe();
    }
}
