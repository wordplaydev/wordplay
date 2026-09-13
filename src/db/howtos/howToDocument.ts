/**
 * A how-to document's version constants and its two pure constructors.
 *
 * Separate from HowToDatabase.svelte.ts, which value-imports `@db/Database` and so
 * cannot be reached from a test that doesn't mock it — the same reason `makeKit`
 * lives in Kit.ts rather than in KitDatabase.svelte.ts. The type comes back the
 * other way as an `import type`, which is erased and so adds no cycle.
 */
import { unknownFlags } from '@db/projects/Moderation';
import { v4 as uuidv4 } from 'uuid';
import type { HowToDocument } from './HowToDatabase.svelte';

export const HowToSocialSchemaLatestVersion = 1;
export const HowToSchemaLatestVersion = 4;

/** What a how-to that has never asked to be listed in the guide carries (#906). */
export function howToListingInitial() {
    return {
        submittedToGuide: false,
        moderation: 'unrequested' as const,
        moderatedAt: null,
        flags: unknownFlags(),
    };
}

/**
 * A brand new how-to, at the values its create rule requires.
 *
 * Pure and exported for the reason `makeKit` is: `howToServerFieldsInitial()` in
 * firestore.rules states what a how-to may arrive carrying, and a guard nothing is
 * held against drifts from what the client actually sends.
 * rulesFieldsSync.test.ts holds the two together.
 */
export function makeHowTo(fields: {
    creator: string;
    galleryId: string;
    published: boolean;
    xcoord: number;
    ycoord: number;
    collaborators: string[];
    title: string;
    guidingQuestions: string[];
    text: string[];
    locales: string[];
    reactionTypes: Record<string, string>;
    notify: boolean;
    overwriteAccessScope: boolean;
    isPublic: boolean;
}): HowToDocument {
    return {
        v: HowToSchemaLatestVersion,
        id: uuidv4(),
        galleryId: fields.galleryId,
        published: fields.published,
        publishedAt: fields.published ? Date.now() : null,
        xcoord: fields.xcoord,
        ycoord: fields.ycoord,
        title: fields.title,
        guidingQuestions: fields.guidingQuestions,
        text: fields.text,
        creator: fields.creator,
        collaborators: fields.collaborators,
        scopeOverwrite: fields.overwriteAccessScope,
        locales: fields.locales,
        isPublic: fields.isPublic,
        // Never listed on arrival, and never asking to be: a how-to that could be
        // created already approved would be a creator approving themselves.
        ...howToListingInitial(),
        social: {
            v: HowToSocialSchemaLatestVersion,
            notifySubscribers: fields.notify,
            reactionOptions: fields.reactionTypes,
            reactions: Object.fromEntries(
                Object.keys(fields.reactionTypes).map((emoji) => [emoji, []]),
            ),
            usedByProjects: [],
            chat: null,
            bookmarkers: [],
            seenByUsers: [fields.creator],
            viewCount: 0,
        },
    };
}
