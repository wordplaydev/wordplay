import Project, { type SerializedProject } from '@models/Project';
import { Mode } from '@runtime/Evaluator';
import type Node from '@nodes/Node';
import type { ProjectsContext } from '../components/project/Contexts';
import { writable } from 'svelte/store';
import { getPersistedValue, setPersistedValue } from '@db/persist';
import Source from '@nodes/Source';
import {
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    where,
    writeBatch,
} from 'firebase/firestore';
import { firestore } from './firebase';
import type { Unsubscribe } from 'firebase/auth';
import type Translation from '../translation/Translation';
import { FirebaseError } from 'firebase/app';

const LOCAL_STORAGE_KEY = 'projects';

export enum Status {
    Saved = 'saved',
    Saving = 'saving',
    Error = 'error',
}

export default class Projects {
    /** A Svelte store for that contains this. */
    private store: ProjectsContext;

    /** The current list of projects. */
    private projects: Project[];

    /** The status of persisting the projects. */
    private status: Status = Status.Saved;

    /** Debounce timer, used to clear pending requests. */
    private timer: NodeJS.Timer | undefined = undefined;

    /** Realtime query unsubscriber */
    private unsubscribe: Unsubscribe | undefined = undefined;

    constructor(projects: Project[]) {
        this.projects = projects;
        this.store = writable(this);
    }

    getStore() {
        return this.store;
    }

    getStatus() {
        return this.status;
    }

    setProjects(projects: Project[]) {
        // Note that we're saving.
        this.setStatus(Status.Saving);

        // Update the field.
        this.projects = projects;

        // Notify subscribers
        this.store.set(this);

        // Clear pending saves.
        clearTimeout(this.timer);

        // Initiate another.
        this.timer = setTimeout(() => this.save(), 1000);
    }

    setStatus(status: Status) {
        this.status = status;
        this.store.set(this);
    }

    /** Returns a list of all projects */
    all() {
        return this.projects.slice();
    }

    /** Returns the first project with the given name, if it exists. */
    get(id: string) {
        return this.projects.find((project) => project.id === id);
    }

    /** Create a project and return it's ID */
    create(translation: Translation, uid: string) {
        const newProject = new Project(
            null,
            '',
            new Source(translation.ui.placeholders.name, ''),
            [],
            [uid],
            false
        );
        this.addUnique([newProject]);
        return newProject.id;
    }

    /** Delete the project with the given ID, if it exists */
    async delete(id: string) {
        try {
            await deleteDoc(doc(firestore, 'projects', id));
            this.setProjects(
                this.projects.filter((project) => project.id !== id)
            );
        } catch (error) {
            if (error instanceof FirebaseError) {
                console.error(error.code);
                console.error(error.message);
            }
            this.setStatus(Status.Error);
        }
    }

    /** Replaces the project with the given project */
    revise(project: string | Project, revised: Project) {
        this.setProjects(
            this.projects.map((candidate) => {
                if (
                    project instanceof Project
                        ? candidate === project
                        : candidate.id === project
                ) {
                    candidate.cleanup();

                    // Preserve evaluator state.
                    const isPlaying =
                        candidate.evaluator.getMode() === Mode.Play;
                    if (isPlaying) {
                        // Set the evaluator's playing state to the current playing state.
                        revised.evaluator.setMode(Mode.Play);
                    } else {
                        // Play to the same place the old project's evaluator was at.
                        revised.evaluate();
                        revised.evaluator.setMode(Mode.Step);
                    }

                    return revised;
                } else return candidate;
            })
        );
    }

    /** Shorthand for revising nodes in a project */
    reviseNodes(project: Project, revisions: [Node, Node | undefined][]) {
        this.revise(project, project.withRevisedNodes(revisions));
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

        // Then, try to save them in firebase.
        try {
            // Create a batch of all of the new and updated projects.
            const batch = writeBatch(firestore);
            this.projects.forEach((project) => {
                if (!project.saved)
                    batch.set(
                        doc(firestore, 'projects', project.id),
                        project.toObject()
                    );
            });

            await batch.commit();

            // Mark all projects saved.
            this.projects.forEach((project) => (project.saved = true));
        } catch (error) {
            if (error instanceof FirebaseError) {
                console.error(error.code);
                console.error(error.message);
            }
            this.setStatus(Status.Error);
        }
    }

    /** Load from storage */
    loadLocal() {
        const data = getPersistedValue<SerializedProject[]>(LOCAL_STORAGE_KEY);
        this.setProjects(
            data === null
                ? []
                : data.map((project) => Project.fromObject(project))
        );
    }

    async loadRemote(uid: string) {
        if (this.unsubscribe) this.unsubscribe();
        // Any time the user projects changes, update projects.
        this.unsubscribe = onSnapshot(
            query(
                collection(firestore, 'projects'),
                where('uids', 'array-contains', uid)
            ),
            (snapshot) => {
                const projects: SerializedProject[] = [];
                snapshot.forEach((project) => {
                    projects.push(project.data() as SerializedProject);
                });
                this.setProjects(
                    projects.map((project) => Project.fromObject(project))
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

    /** Remove all projects from the store. Usually because of log out. */
    reset() {
        this.setProjects([]);
    }

    addUnique(projects: Project[]) {
        this.setProjects([
            ...this.projects,
            ...projects.filter(
                (project) =>
                    !this.projects.some((proj) => proj.id === project.id)
            ),
        ]);
    }

    /** Convert to an object suitable for JSON serialization */
    toObject(): SerializedProject[] {
        return this.projects.map((project) => project.toObject());
    }

    /** Clean up listeners */
    clean() {
        if (this.unsubscribe) this.unsubscribe();
    }
}
