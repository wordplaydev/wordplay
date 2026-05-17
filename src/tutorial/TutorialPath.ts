/**
 * Path scheme for tutorial text overrides.
 *
 * Tutorial text lives in `static/locales/{locale}/{locale}-tutorial.json` and is
 * a different shape from the general locale JSON, so it has its own family of
 * override keys. The scheme mirrors the tutorial's JSON structure so a path is
 * human-readable and trivially mappable back to a position in the file:
 *
 *   tutorial.acts.{a}.title
 *   tutorial.acts.{a}.scenes.{s}.title
 *   tutorial.acts.{a}.scenes.{s}.subtitle
 *   tutorial.acts.{a}.scenes.{s}.lines.{l}.dialog
 *
 * `a`, `s`, and `l` are 0-indexed array offsets that match the JSON's `acts[]`,
 * `scenes[]`, and `lines[]`. The trailing `dialog` segment marks the joined
 * markup body of a Dialog tuple (Dialog[2..] concatenated by `\n\n`); the
 * character at Dialog[0] and emotion at Dialog[1] are not translator-editable
 * and so have no path.
 *
 * Override values are stored in the same `LocalizationDexie` table used for
 * UI locale edits; the `tutorial.` prefix prevents collisions.
 */

export const TUTORIAL_KEY_PREFIX = 'tutorial';

/** Override key for an act's title (e.g., shown on the act title card). */
export function actTitlePath(actIndex: number): string {
    return `${TUTORIAL_KEY_PREFIX}.acts.${actIndex}.title`;
}

/** Override key for a scene's title. */
export function sceneTitlePath(actIndex: number, sceneIndex: number): string {
    return `${TUTORIAL_KEY_PREFIX}.acts.${actIndex}.scenes.${sceneIndex}.title`;
}

/** Override key for a scene's subtitle (optional in the JSON). */
export function sceneSubtitlePath(
    actIndex: number,
    sceneIndex: number,
): string {
    return `${TUTORIAL_KEY_PREFIX}.acts.${actIndex}.scenes.${sceneIndex}.subtitle`;
}

/** Override key for the joined markup body of a Dialog tuple at scene.lines[lineIndex]. */
export function dialogTextPath(
    actIndex: number,
    sceneIndex: number,
    lineIndex: number,
): string {
    return `${TUTORIAL_KEY_PREFIX}.acts.${actIndex}.scenes.${sceneIndex}.lines.${lineIndex}.dialog`;
}

/** True if a key is a tutorial-text override (as opposed to a regular UI locale edit). */
export function isTutorialKey(key: string): boolean {
    return key.startsWith(`${TUTORIAL_KEY_PREFIX}.`);
}
