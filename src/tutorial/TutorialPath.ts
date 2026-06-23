/**
 * Path scheme for tutorial text overrides.
 *
 * Tutorial text lives in `static/locales/{locale}/{locale}-tutorial.json` (and, per mode,
 * `{locale}-tutorial-{mode}.json`) and is a different shape from the general locale JSON, so it
 * has its own family of override keys. The scheme mirrors the tutorial's JSON structure so a path
 * is human-readable and trivially mappable back to a position in the file:
 *
 *   tutorial.acts.{a}.title
 *   tutorial.acts.{a}.scenes.{s}.title
 *   tutorial.acts.{a}.scenes.{s}.subtitle
 *   tutorial.acts.{a}.scenes.{s}.lines.{l}.dialog
 *
 * The prefix is namespaced by tutorial mode so two tutorials of the same locale (e.g. the
 * `complete` and `quick` tutorials) don't collide: the default mode keeps the bare `tutorial`
 * prefix (preserving existing overrides), other modes use `tutorial-{mode}`.
 *
 * `a`, `s`, and `l` are 0-indexed array offsets that match the JSON's `acts[]`, `scenes[]`, and
 * `lines[]`. The trailing `dialog` segment marks the joined markup body of a Dialog tuple
 * (Dialog[2..] concatenated by `\n\n`); the character at Dialog[0] and emotion at Dialog[1] are
 * not translator-editable and so have no path.
 *
 * Override values are stored in the same `LocalizationDexie` table used for UI locale edits; the
 * `tutorial` prefix prevents collisions.
 */

import {
    DEFAULT_TUTORIAL_MODE,
    type TutorialMode,
} from './TutorialMode';

export const TUTORIAL_KEY_PREFIX = 'tutorial';

/** The override-key prefix for a tutorial mode (the default mode keeps the bare prefix). */
function keyPrefix(mode: TutorialMode): string {
    return mode === DEFAULT_TUTORIAL_MODE
        ? TUTORIAL_KEY_PREFIX
        : `${TUTORIAL_KEY_PREFIX}-${mode}`;
}

/** Override key for an act's title (e.g., shown on the act title card). */
export function actTitlePath(mode: TutorialMode, actIndex: number): string {
    return `${keyPrefix(mode)}.acts.${actIndex}.title`;
}

/** Override key for a scene's title. */
export function sceneTitlePath(
    mode: TutorialMode,
    actIndex: number,
    sceneIndex: number,
): string {
    return `${keyPrefix(mode)}.acts.${actIndex}.scenes.${sceneIndex}.title`;
}

/** Override key for a scene's subtitle (optional in the JSON). */
export function sceneSubtitlePath(
    mode: TutorialMode,
    actIndex: number,
    sceneIndex: number,
): string {
    return `${keyPrefix(mode)}.acts.${actIndex}.scenes.${sceneIndex}.subtitle`;
}

/** Override key for the joined markup body of a Dialog tuple at scene.lines[lineIndex]. */
export function dialogTextPath(
    mode: TutorialMode,
    actIndex: number,
    sceneIndex: number,
    lineIndex: number,
): string {
    return `${keyPrefix(mode)}.acts.${actIndex}.scenes.${sceneIndex}.lines.${lineIndex}.dialog`;
}

/** True if a key is a tutorial-text override (as opposed to a regular UI locale edit). */
export function isTutorialKey(key: string): boolean {
    return (
        key.startsWith(`${TUTORIAL_KEY_PREFIX}.`) ||
        key.startsWith(`${TUTORIAL_KEY_PREFIX}-`)
    );
}
