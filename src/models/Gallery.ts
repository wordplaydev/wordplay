import type Locale from '../locale/Locale';
import { toLocaleString } from '../locale/Locale';

/** The schema for a gallery */
export type SerializedGallery = {
    /** Unique Firestore id */
    id: string;
    /** A vanity URL name, globally unique, must be valid URL path */
    path: string | null;
    /** One or more localized names of the gallery, indexed by locale name. Cannot be empty. */
    name: Record<string, string>;
    /** Localized descriptions of the theme of the gallery, indexed by locale name. Cannot be empty. */
    description: Record<string, string>;
    /**
     * A set of unique lower case non-preposition words that appear in the names and descriptions, suitable for basic text search.
     * These are derived from the name and description.
     */
    words: string[];
    /** Project IDs in the project. */
    projects: string[];
    /** Firebase uids who can modify gallery public and creators, e.g. teachers. May not be empty. */
    curators: string[];
    /** Firebase uids who can add projects to the gallery and view its projects, e.g. students */
    creators: string[];
    /** If true, gallery can be viewed by anyone and appears in search results. */
    public: boolean;
    /** If true, gallery is prioritized in search results */
    featured: boolean;
};

/**
 * A wrapper to represent a Gallery document from the database. It helps enforce
 * rules and semantics about galleries client-side.
 */
export default class Gallery {
    readonly data: SerializedGallery;
    constructor(data: SerializedGallery) {
        this.data = { ...data };
    }

    /** Get the best name given a locale */
    getName(locale: Locale) {
        // Is there a name for this specific locale and region? If not, choose the first one.
        return (
            this.data.name[toLocaleString(locale)] ??
            Object.values(this.data.name)[0]
        );
    }

    withName(name: string, locale: Locale) {
        const newData = { ...this.data };
        newData.name = { ...newData.name };
        newData.name[toLocaleString(locale)] = name;
        return new Gallery(newData);
    }

    /** Get the best description given a locale */
    getDescription(locale: Locale) {
        // Is there a name for this specific locale and region? If not, choose the first one.
        return (
            this.data.description[toLocaleString(locale)] ??
            Object.values(this.data.description)[0]
        );
    }

    withDescription(name: string, locale: Locale) {
        const newData = { ...this.data };
        newData.description = { ...newData.description };
        newData.description[toLocaleString(locale)] = name;
        return new Gallery(newData);
    }

    getID() {
        return this.data.id;
    }

    getCurators() {
        return this.data.curators;
    }

    withCurator(uid: string) {
        const newData = { ...this.data };
        newData.curators = [...new Set([...newData.curators, uid])];
        return new Gallery(newData);
    }

    withoutCurator(uid: string) {
        const newData = { ...this.data };
        newData.projects = [...newData.projects.filter((id) => id !== uid)];
        return new Gallery(newData);
    }

    getCreators() {
        return this.data.creators;
    }

    withCreator(uid: string) {
        const newData = { ...this.data };
        newData.creators = [...new Set([...newData.creators, uid])];
        return new Gallery(newData);
    }

    withoutCreator(uid: string) {
        const newData = { ...this.data };
        newData.creators = [...newData.creators.filter((id) => id !== uid)];
        return new Gallery(newData);
    }

    getProjects(): string[] {
        return this.data.projects;
    }

    isPublic() {
        return this.data.public;
    }

    asPublic(isPublic: boolean) {
        const newData = { ...this.data };
        newData.public = isPublic;
        return new Gallery(newData);
    }

    hasProject(projectID: string) {
        return this.data.projects.includes(projectID);
    }

    withProject(projectID: string) {
        const newData = { ...this.data };
        newData.projects = [...new Set([...newData.projects, projectID])];
        return new Gallery(newData);
    }

    withoutProject(projectID: string) {
        const newData = { ...this.data };
        newData.projects = [
            ...newData.projects.filter((id) => id !== projectID),
        ];
        return new Gallery(newData);
    }

    withProjects(projectIDs: string[]) {
        const newData = { ...this.data };
        newData.projects = projectIDs.slice();
        return new Gallery(newData);
    }
}
