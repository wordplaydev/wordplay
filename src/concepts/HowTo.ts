// A how to is an explanation for how to combine two or more concepts to achieve a particular behavior in a project
// (e.g., making a phrase spin, moving a phrase with a pointer or keyboard, creating an animated multi-step scene).
// This is the data structure that defines a how to's content and metadata.
import { parseLocaleDoc } from '@locale/LocaleText';
import type Markup from '@nodes/Markup';

// How to category IDs. (The text to describe them live in locale definitions.
// The order of these categories is the order they appear in the interface.
export const HowToCategories = {
    characters: 0,
    styling: 1,
    layout: 2,
    randomization: 4,
    remembering: 5,
    animation: 6,
    stories: 7,
    motion: 8,
    video: 9,
} as const;

export type HowToCategory = keyof typeof HowToCategories;

// A mapping of how to IDs to categories. Must be declared here to add to the project.
// If they're not added, they won't appear in the interface. We make them explicit here
// to allow drafts in the repository that aren't yet ready to be shown. We just
// have to remember to add them when they're ready!
export const HowToMetadata = {
    'animate-phrase': { category: 'characters' },
    'move-phrase': { category: 'characters' },
    'custom-characters': { category: 'characters' },
    'styling-text': { category: 'characters' },
    'animated-scene': { category: 'stories' },
    'interactive-scene': { category: 'stories' },
    'shake-phrase': { category: 'randomization' },
    'video-grid': { category: 'video' },
    'track-points': { category: 'remembering' },
    'track-game-state': { category: 'remembering' },
    'offer-choices': { category: 'remembering' },
    'choose-adventure': { category: 'remembering' },
} satisfies Record<string, { category: HowToCategory }>;

export const HowToIDs = Object.keys(HowToMetadata);

export type HowToID = keyof typeof HowToMetadata;

/**
 * The schema for a how to. This is parsed and generated based on the serialized format of a how to document.
 */
type HowTo = {
    /**
     * A unique identifier that determines 1) the folder in /static/ in which it's stored, 2) the id in the URL in the guide.
     * It must be valid URL characters in a URL path name [a-zA-Z0-9_-].
     * */
    id: HowToID;
    /** A title that finishes the sentence "how to..." */
    title: string;
    /** The category the example belongs in */
    category: HowToCategory;
    /** The markup and example code that explains how to. Arbitrary  */
    content: Markup;
    /** A hand curated list of related how to IDs  */
    related: HowToID[];
};

/**
 * Parses a text file into a how to data structure, or null if it's not valid.
 * The format of a how to is just:
 * [title]
 * [content, can be multiple lines]
 * [comma separated list of related how to IDs]
 */
export function parseHowTo(
    id: string,
    text: string,
): { how: HowTo | null; error: string | null } {
    if (!HowToIDs.includes(id as HowToID)) {
        return {
            how: null,
            error: `how to '${id}' is not a valid how to ID. Make sure it's defined in HowTo.ts`,
        };
    }

    const howToID = id as HowToID;

    const lines = text.trim().split('\n');
    if (lines.length < 3)
        return {
            how: null,
            error:
                'Only found ' +
                lines.length +
                ' lines in the how to file, but expected 3',
        };

    // First line is the title.
    const title = lines.shift();
    if (title === undefined)
        return { how: null, error: "Couldn't find a title." };

    // Last line are the related how to IDs.
    const related =
        lines
            .pop()
            ?.split(',')
            .map((id) => id.trim()) ?? [];

    for (const rel of related) {
        if (!HowToIDs.includes(rel as HowToID)) {
            return {
                how: null,
                error: `Related how to '${rel}' is not in the list of how to IDs. Make sure it's defined in HowTo.ts.`,
            };
        }
    }

    const content = parseLocaleDoc(lines.join('\n').trim()).markup;

    // Parse the text into the how to data structure
    return {
        how: {
            id: howToID,
            title,
            category: HowToMetadata[howToID].category,
            content: content,
            related: related as HowToID[],
        },
        error: null,
    };
}

export type { HowTo as default };
