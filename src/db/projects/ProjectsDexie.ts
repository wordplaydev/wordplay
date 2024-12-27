import {
    type SerializedProject,
    ProjectSchemaLatestVersion,
    type SerializedProjectUnknownVersion,
} from '@db/projects/ProjectSchemas';
import Dexie, { type Table, type Observable, liveQuery } from 'dexie';

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

    async deleteAllProjects(): Promise<void> {
        return await this.projects.clear();
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
