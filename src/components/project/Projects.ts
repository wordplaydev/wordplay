import Project from '@models/Project';
import { Mode } from '@runtime/Evaluator';
import type Node from '@nodes/Node';
import type { ProjectsContext } from './Contexts';
import { writable } from 'svelte/store';
import { getPersistedValue, setPersistedValue } from '../app/persist';
import debounce from '../../util/debounce';
import Source from '../../nodes/Source';
import { parseNames, toTokens } from '../../parser/Parser';

const LOCAL_STORAGE_KEY = 'projects';

type SerializedSource = { names: string; code: string };
type SerializedProjects = {
    id: string;
    name: string;
    sources: SerializedSource[];
}[];

enum Status {
    Saved = 'saved',
    Saving = 'saving',
    Error = 'error',
}

export default class Projects {
    private store: ProjectsContext;
    private projects: Project[];

    private status: Status = Status.Saved;

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
        // Update the field.
        this.projects = projects;
        // Notify subscribers
        this.store.set(this);
        // Debounce a save
        debounce(() => this.save());
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

    /** Replaces the project with the given project */
    revise(project: string | Project, revised: Project) {
        this.setProjects(
            this.projects.map((candidate) => {
                if (
                    project instanceof Project
                        ? candidate === project
                        : candidate.name === project
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

    /** Persist in storage somewhere */
    save() {
        try {
            setPersistedValue(LOCAL_STORAGE_KEY, this.toObject());
        } catch (_) {
            this.setStatus(Status.Error);
        }
    }

    /** Load from storage */
    async load() {
        function sourceToSource(source: SerializedSource): Source {
            return new Source(parseNames(toTokens(source.names)), source.code);
        }

        const data = getPersistedValue<SerializedProjects>(LOCAL_STORAGE_KEY);
        this.setProjects(
            data === null
                ? []
                : data.map(
                      (project) =>
                          new Project(
                              project.id,
                              project.name,
                              sourceToSource(project.sources[0]),
                              project.sources
                                  .slice(1)
                                  .map((source) => sourceToSource(source))
                          )
                  )
        );
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
    toObject(): SerializedProjects {
        return this.projects.map((project) => {
            return {
                id: project.id,
                name: project.name,
                sources: project.getSources().map((source) => {
                    return {
                        names: source.names.toWordplay(),
                        code: source.code.toString(),
                    };
                }),
            };
        });
    }
}
