import type { User } from 'firebase/auth';
import { entriesOf, includesString, keysOf } from '@util/nullable';
import type Locales from '@locale/Locales';
import type LocaleText from '@locale/LocaleText';
import type { FormattedText } from '@locale/LocaleText';
import { holdsClaim } from '@db/creators/getClaim';
import z from 'zod';

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

const FlagNames = keysOf(Flags);

/** Whether a string (from a stored document or a URL) names a flag. */
export function isFlag(flag: string): flag is Flag {
    return includesString(FlagNames, flag);
}

/** An object literal type that contains a template for each of the moderation flags */
export type FlagDescriptions = { [key in Flag]: FormattedText };

/** Represents a moderation state. null = unknown, true = violates flag, false = doesn't */
export type FlagState = boolean | null;

/** An object literal type that contains states for all moderation flags. */
export type ModerationState = { [key in Flag]: FlagState };

/** The persisted shape of a {@link ModerationState}. Declared once here and
 *  reused by everything that stores one — projects and galleries — so a new
 *  flag can't be added to `Flags` and forgotten in a schema. */
export const ModerationStateSchema = z.object({
    dehumanization: z.nullable(z.boolean()),
    violence: z.nullable(z.boolean()),
    disclosure: z.nullable(z.boolean()),
    misinformation: z.nullable(z.boolean()),
});

export function withFlag(
    flags: ModerationState,
    flag: string,
    state: FlagState,
): ModerationState {
    if (!isFlag(flag)) return flags;
    return { ...flags, [flag]: state };
}

/** A moderation state with every flag in the given state. Spelled out so
 *  that adding a flag to `Flags` fails to compile here rather than shipping a
 *  state that lacks it. */
function everyFlag(state: FlagState): ModerationState {
    return {
        dehumanization: state,
        violence: state,
        disclosure: state,
        misinformation: state,
    };
}

/** Return a moderation state with all flags false */
export function moderatedFlags(): ModerationState {
    return everyFlag(false);
}

/** Return a moderation state with all flags null */
export function unknownFlags(): ModerationState {
    return everyFlag(null);
}

/** Get descriptions of all true warning flags */
export function getWarnings(flags: ModerationState, locale: LocaleText) {
    return entriesOf(flags)
        .filter(
            ([flag, state]) => state === true && Flags[flag] === Remedy.Warn,
        )
        .map(([flag]) => locale.moderation.flags[flag]);
}

/** Get descriptions of all true block flags */
export function getBlocks(flags: ModerationState, locale: LocaleText) {
    return entriesOf(flags)
        .filter(
            ([flag, state]) => state === true && Flags[flag] === Remedy.Block,
        )
        .map(([flag]) => locale.moderation.flags[flag]);
}

/** True if one of the flags is true and is a flagged that's warned  */
export function getUnmoderated(flags: ModerationState, locale: LocaleText) {
    return entriesOf(flags)
        .filter(([, state]) => state === null)
        .map(([flag]) => locale.moderation.flags[flag]);
}

/** The flag names that are true and warned about (for the start gate). */
export function getWarnFlags(flags: ModerationState): Flag[] {
    return flagsMatching(
        flags,
        (flag, state) => state === true && Flags[flag] === Remedy.Warn,
    );
}

/** The flag names that are true and blocked (for the start gate). */
export function getBlockFlags(flags: ModerationState): Flag[] {
    return flagsMatching(
        flags,
        (flag, state) => state === true && Flags[flag] === Remedy.Block,
    );
}

/** The flag names that haven't been moderated yet (for the start gate). */
export function getUnmoderatedFlags(flags: ModerationState): Flag[] {
    return flagsMatching(flags, (_, state) => state === null);
}

function flagsMatching(
    flags: ModerationState,
    matches: (flag: Flag, state: FlagState) => boolean,
): Flag[] {
    return FlagNames.filter((flag) => matches(flag, flags[flag]));
}

/** Every flag name, typed. Lets a view name each checkbox by its own rule rather than
 *  giving all four the one shared label a screen reader would otherwise read. */
export function allFlags(): Flag[] {
    return [...FlagNames];
}

export function isFlagged(flags: ModerationState) {
    return Object.values(flags).some((state) => state === true);
}

export function getFlagDescription(
    flag: string,
    locales: Locales,
): string | undefined {
    return isFlag(flag)
        ? locales.getTextStructure((l) => l.moderation.flags)[flag]
        : undefined;
}

/**
 * Whether this creator may moderate: the `mod` claim, or the `admin` claim that
 * implies it.
 *
 * The one place the app asks, which is what lets a superuser reach the queue,
 * the notification bell's review button, and the feedback controls without
 * three separate sites having to remember the implication.
 */
export async function isModerator(user: User) {
    return (await holdsClaim(user, 'mod')) === true;
}

/** Whether this creator may manage classes: the `teacher` claim, or `admin`. */
export async function isTeacher(user: User) {
    return (await holdsClaim(user, 'teacher')) === true;
}

/** Whether this creator is a superuser. Nothing implies this one. */
export async function isAdmin(user: User) {
    return (await holdsClaim(user, 'admin')) === true;
}
