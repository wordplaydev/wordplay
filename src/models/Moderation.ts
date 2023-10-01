import type { Template } from '../locale/Locale';

/** Ways the platform can respond to a content moderation flag */
export enum Remedy {
    /** Don't allow the content to be seen */
    Block = 'block',
    /** Warn about the nature of the content */
    Warn = 'warn',
}

/**
 * These are the internal names that define categories of content moderation violations.
 * They're used as property names in moderation state in projects and galleries.
 * T
 */
export const Flags = {
    /** Content that treats any individual or group of people as less than human */
    dehumanization: Remedy.Warn,
    /** Content that incites, encourages, or celebrates violence or harm */
    violence: Remedy.Block,
    /** Content that reveals private information about someone else */
    disclosure: Remedy.Block,
    /** Content that is false, misleading, deceiving, or manipulative */
    misinformation: Remedy.Warn,
} as const;

/** A type used to ensure that locales have descriptions for all flags */
export type Flag = keyof typeof Flags;

/** An object literal type that contains a template for each of the moderation flags */
export type FlagDescriptions = {
    [key in Flag]: Template;
};

/** Represents a moderation state. null = unknown, true = violates flag, false = doesn't */
export type FlagState = boolean | null;

/** An object literal type that contains states for all moderation flags. */
export type Moderation = {
    [key in Flag]: FlagState;
};
