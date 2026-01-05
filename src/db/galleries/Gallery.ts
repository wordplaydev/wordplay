import { localeToString } from '@locale/Locale';
import type Locales from '@locale/Locales';
import type LocaleText from '@locale/LocaleText';
import z from 'zod';

export const GallerySchemaLatestVersion = 2;

/** The schema for a gallery */
const SerializedGalleryV1 = z.object({
    /** Version of the gallery schema, so we can upgrade them. */
    v: z.literal(1),
    /** Unique Firestore id */
    id: z.string(),
    /** A vanity URL name, globally unique, must be valid URL path */
    path: z.string().nullable(),
    /** One or more localized names of the gallery, indexed by locale name. Cannot be empty. */
    name: z.record(z.string(), z.string()),
    /** Localized descriptions of the theme of the gallery, indexed by locale name. Cannot be empty. */
    description: z.record(z.string(), z.string()),
    /**
     * A set of unique lower case non-preposition words that appear in the names and descriptions, suitable for basic text search.
     * These are derived from the name and description.
     */
    words: z.array(z.string()),
    /** Project IDs in the project. */
    projects: z.array(z.string()),
    /** Firebase uids who can modify gallery public and creators, e.g. teachers. May not be empty. */
    curators: z.array(z.string()),
    /** Firebase uids who can add projects to the gallery and view its projects, e.g. students */
    creators: z.array(z.string()),
    /** If true, gallery can be viewed by anyone and appears in search results. */
    public: z.boolean(),
    /** If true, gallery is prioritized in search results */
    featured: z.boolean(),
});

/** v2 adds configurations for the how-to space */
const SerializedGalleryV2 = SerializedGalleryV1.omit({ v: true }).extend({
    v: z.literal(2),
    /** visibility of the how-to space: false if limited to gallery's own permissions, true if expanded to allow gallery creators' other galleries' creators and curators to also view */
    howToExpandedVisibility: z.boolean(),
    /** guiding questions for creating a how-to */
    howToGuidingQuestions: z.array(z.string()),
    /** reaction options for the how-tos */
    howToReactions: z.record(z.string(), z.string()),
})

/** The latest version of a gallery */
export const GallerySchema = SerializedGalleryV2;
export type SerializedGallery = z.infer<typeof SerializedGalleryV2>;

type SerializedGalleryUnknownVersion = | z.infer<typeof SerializedGalleryV1> | SerializedGallery;

export function upgradeGallery(
    gallery: SerializedGalleryUnknownVersion,
): SerializedGallery {
    switch (gallery.v) {
        case 1:
            // default guiding questions and reactions
            return upgradeGallery({
                ...gallery, v: 2, howToExpandedVisibility: false,
                howToGuidingQuestions: ["Tell us the story of how you discovered this"],
                howToReactions: {
                    "👍": "I like this!", "💭": "This inspires me!",
                    "🙏": "Thank you!", "🎉": "Celebration!",
                    "🤩": "I want to try this!", "😁": "This makes me happy!"
                }
            })
        case GallerySchemaLatestVersion:
            return gallery;
        default:
            throw new Error('unknown gallery version: ' + gallery.v) as never;
    }
}

export function deserializeGallery(gallery: unknown): Gallery {
    return new Gallery(
        upgradeGallery(gallery as SerializedGalleryUnknownVersion),
    );
}

/**
 * A wrapper to represent a Gallery document from the database. It helps enforce
 * rules and semantics about galleries client-side.
 */
export default class Gallery {
    readonly data: SerializedGallery;
    constructor(data: SerializedGallery) {
        data = upgradeGallery(data);

        this.data = { ...data };

        // Guarantee no duplicates.
        this.data.curators = Array.from(new Set(this.data.curators));
        this.data.creators = Array.from(new Set(this.data.creators));
    }

    /** Get the best name given a locale */
    getName(locales: Locales) {
        return locales.get((l) => this.data.name[localeToString(l)]);
    }

    withName(name: string, locale: LocaleText) {
        const newData = { ...this.data };
        newData.name = { ...newData.name };
        newData.name[localeToString(locale)] = name;
        return new Gallery(newData);
    }

    /** Get the best description given a locale */
    getDescription(locales: Locales) {
        // Is there a name for this specific locale and region? If not, choose the first one.
        return locales.get((l) => this.data.description[localeToString(l)]);
    }

    withDescription(name: string, locale: LocaleText) {
        const newData = { ...this.data };
        newData.description = { ...newData.description };
        newData.description[localeToString(locale)] = name;
        return new Gallery(newData);
    }

    getID() {
        return this.data.id;
    }

    getLink() {
        return `/gallery/${this.getID()}`;
    }

    hasCurator(uid: string) {
        return this.data.curators.includes(uid);
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
        return new Gallery({
            ...this.data,
            curators: this.data.curators.filter((id) => id !== uid),
        });
    }

    getCreators() {
        return this.data.creators;
    }

    hasCreator(uid: string) {
        return this.data.creators.includes(uid);
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

    getHowToExpandedVisibility(): boolean {
        return this.data.howToExpandedVisibility;
    }

    getHowToGuidingQuestions(): string[] {
        return this.data.howToGuidingQuestions;
    }

    getHowToReactions(): Record<string, string> {
        return this.data.howToReactions;
    }

    getData() {
        return { ... this.data };
    }
}
