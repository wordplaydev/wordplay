import Dexie, { type Table } from 'dexie';
import type { SerializedProject } from '../models/Project';

export class ProjectsDatabase extends Dexie {
    projects!: Table<SerializedProject>;

    constructor() {
        super('wordplay');
        this.version(1).stores({
            projects: '++id, name, locales, uids, listed',
        });
    }

    async get(id: string): Promise<SerializedProject | undefined> {
        const project = await this.projects.where('id').equals(id).toArray();
        return project[0];
    }

    save(projects: SerializedProject[]) {
        this.projects.bulkPut(projects);
    }

    async all(): Promise<SerializedProject[]> {
        return this.projects.toArray();
    }
}
