import type { User } from 'firebase/auth';
import type { Locale, Template } from '../locale/Locale';
import type Project from './Project';
import type Locales from '../locale/Locales';

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

export function withFlag(
    flags: Moderation,
    flag: string,
    state: FlagState
): Moderation {
    if (!(flag in Flags)) return flags;
    const newFlags = { ...flags };
    newFlags[flag as Flag] = state;
    return newFlags;
}

/** Return a moderation state with all flags false */
export function moderatedFlags(): Moderation {
    const newFlags: Record<string, FlagState> = {};
    for (const flag of Object.keys(Flags)) newFlags[flag] = false;
    return newFlags as Moderation;
}

/** Return a moderation state with all flags null */
export function unknownFlags(): Moderation {
    const newFlags: Record<string, FlagState> = {};
    for (const flag of Object.keys(Flags)) newFlags[flag] = null;
    return newFlags as Moderation;
}

/** Get descriptions of all true warning flags */
export function getWarnings(flags: Moderation, locale: Locale) {
    return Object.entries(flags)
        .filter(
            ([flag, state]) =>
                state === true && Flags[flag as Flag] === Remedy.Warn
        )
        .map(([flag]) => locale.moderation.flags[flag as Flag]);
}

/** Get descriptions of all true block flags */
export function getBlocks(flags: Moderation, locale: Locale) {
    return Object.entries(flags)
        .filter(
            ([flag, state]) =>
                state === true && Flags[flag as Flag] === Remedy.Block
        )
        .map(([flag]) => locale.moderation.flags[flag as Flag]);
}

/** True if one of the flags is true and is a flagged that's warned  */
export function getUnmoderated(flags: Moderation, locale: Locale) {
    return Object.entries(flags)
        .filter(([, state]) => state === null)
        .map(([flag]) => locale.moderation.flags[flag as Flag]);
}

export function isFlagged(flags: Moderation) {
    return Object.values(flags).some((state) => state === true);
}

export function isAudience(user: User | null, project: Project): boolean {
    return (
        project.isPublic() &&
        (user === null ||
            (project.getOwner() !== user.uid &&
                !project.hasCollaborator(user.uid)))
    );
}

export function getFlagDescription(
    flag: string,
    locales: Locales
): string | undefined {
    return locales.get((l) => l.moderation.flags)[flag as Flag];
}

export async function isModerator(user: User) {
    return user
        .getIdTokenResult()
        .then((idTokenResult) => {
            return idTokenResult.claims.mod === true;
        })
        .catch(() => {
            return false;
        });
}
