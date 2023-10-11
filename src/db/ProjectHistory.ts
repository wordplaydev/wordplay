import { get, writable, type Writable } from 'svelte/store';
import type Project from '../models/Project';
import type Locale from '../locale/Locale';

// Remember this many project edits.
const PROJECT_HISTORY_LIMIT = 1000;

export enum ChangeType {
    Edit = 'edited',
    UndoRedo = 'undoredo',
}

/**
 * An class representing a project and its history, and a Svelte store for reactivity
 * on changes to the project.
 */
export class ProjectHistory {
    /** The id of the project being tracked */
    readonly id: string;
    /** A Svelte store of the current version of the project. */
    private current: Writable<Project>;
    /**
     * Previous versions of the project.
     * It always contains the current version of the project and is therefore never empty.
     * There is one history for the entire project; no per-source history.
     * History is not persisted, it's session-only.
     */
    private history: Project[] = [];
    /**  The index of the current project in the history. */
    private index: number;
    /** The type of change recently made to the project, so that editors know how to handle caret positions.  */
    private change: ChangeType = ChangeType.Edit;

    /** True if this was successfully saved in the remote database. */
    private saved = false;

    /** True if this should be persisted in databases */
    private persist: boolean;

    /** True if the last edit was an overwrite */
    private overwrite = false;

    constructor(project: Project, persist: boolean, saved: boolean) {
        this.id = project.id;
        this.current = writable(project);
        this.history.push(project);
        this.index = 0;
        this.persist = persist ?? true;
        this.saved = saved;
    }

    /** Revise this project history to have all of the specified locales. */
    withLocales(locales: Locale[]) {
        this.current.set(get(this.current).withLocales(locales));
        this.history = this.history.map((proj) => proj.withLocales(locales));
    }

    getCurrent() {
        return get(this.current);
    }

    getStore() {
        return this.current;
    }

    edit(project: Project, remember: boolean, overwrite = false) {
        // Is the undo pointer before the end? Trim the future before we add the future.
        this.history.splice(
            this.index + 1,
            this.history.length - this.index - 1
        );

        // If we're remembering the last change, append the new project version.
        if (remember) this.history = [...this.history, project];
        // Otherwise, replace the latest version.
        else this.history[this.history.length - 1] = project;

        // Mark this as an edit change.
        this.change = ChangeType.Edit;

        // Reset the index to the end.
        this.index = this.history.length - 1;

        // Mark it as not saved.
        this.saved = false;

        // Update overwrite
        this.overwrite = overwrite;

        // Trim the history if we've exceeded our limit.
        if (this.history.length > PROJECT_HISTORY_LIMIT)
            this.history.splice(0, PROJECT_HISTORY_LIMIT - this.history.length);

        // Ping the store, so everyone knows about the edit.
        this.current.set(project);
    }

    ping() {
        this.current.set(this.getCurrent());
    }

    isUndoable() {
        return this.index > 0;
    }

    isRedoable() {
        return this.index < this.history.length - 1;
    }

    wasOverwritten() {
        return this.overwrite;
    }

    undoRedo(direction: -1 | 1): Project | undefined {
        // In the present? Do nothing.
        if (direction > 0 && this.index === this.history.length - 1)
            return undefined;
        // No more history? Do nothing.
        else if (direction < 0 && this.index === 0) return undefined;

        // Move the index back a step in time
        this.index += direction;

        const newProject = this.history[this.index];

        // Change the current project to the historical project.
        this.current.set(newProject);

        // Set the change type to undo/redo.
        this.change = ChangeType.UndoRedo;

        // Mark unsaved
        this.saved = false;

        // Reset overwrite.
        this.overwrite = false;

        return newProject;
    }

    isUnsaved() {
        return !this.saved;
    }

    markSaved() {
        this.saved = true;
    }

    wasEdited() {
        return this.change === ChangeType.Edit;
    }

    wasRestored() {
        return this.change === ChangeType.UndoRedo;
    }

    isPersisted() {
        return this.persist;
    }

    setPersist() {
        this.persist = true;
    }
}
