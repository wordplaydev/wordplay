/** The tutorial variants the /learn route can present. "complete" is the original,
 * narrative-driven tutorial; "quick" is a short tour for creators who already know another
 * programming language. */
export const TutorialModes = ['quick', 'complete'] as const;

export type TutorialMode = (typeof TutorialModes)[number];

/** The mode assumed when none is specified, so that pre-existing /learn URLs (which have no
 * tutorial query parameter) keep loading the original tutorial. */
export const DEFAULT_TUTORIAL_MODE: TutorialMode = 'complete';

/** Parse an unknown value (URL parameter or stored setting) into a TutorialMode, or undefined
 * if it isn't one. */
export function parseTutorialMode(value: unknown): TutorialMode | undefined {
    return typeof value === 'string' &&
        (TutorialModes as readonly string[]).includes(value)
        ? (value as TutorialMode)
        : undefined;
}
