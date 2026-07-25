/** Keyboard navigation shared by the option-group widgets (Mode's radiogroup and
 *  Tabbed's tablist). Both follow the ARIA authoring practices pattern where the
 *  group is a single tab stop and arrow keys move the selection within it, so the
 *  index math lives here and is unit tested rather than duplicated in two
 *  components. */

/** The keys this module handles, so callers can preventDefault only on those. */
export const NavigationKeys = [
    'ArrowRight',
    'ArrowLeft',
    'ArrowDown',
    'ArrowUp',
    'Home',
    'End',
] as const;

/** Which option a navigation key should move to, or undefined when `key` isn't
 *  one this module handles (so the caller lets the event through).
 *
 *  `visible` is the list of option indices actually rendered, in visual order,
 *  with any omitted ones already filtered out — navigation walks it so hidden
 *  options are skipped and wrapping lands on a real option. Inline arrows
 *  (left/right) follow reading order and so swap under `rtl`; block arrows
 *  (up/down) never do. */
export function getNextOption(
    visible: readonly number[],
    current: number,
    key: string,
    rtl: boolean,
): number | undefined {
    if (visible.length === 0) return undefined;

    const delta =
        key === 'ArrowDown' || key === (rtl ? 'ArrowLeft' : 'ArrowRight')
            ? 1
            : key === 'ArrowUp' || key === (rtl ? 'ArrowRight' : 'ArrowLeft')
              ? -1
              : undefined;

    if (delta !== undefined) {
        // An option that isn't visible (or no selection yet) has no neighbors to
        // move from, so start at the near end in the direction of travel.
        const at = visible.indexOf(current);
        if (at === -1)
            return delta === 1 ? visible[0] : visible[visible.length - 1];
        return visible[(at + delta + visible.length) % visible.length];
    }

    if (key === 'Home') return visible[0];
    if (key === 'End') return visible[visible.length - 1];

    return undefined;
}

/** Whether `key` is one `getNextOption` handles. */
export function isNavigationKey(key: string): boolean {
    return NavigationKeys.some((candidate) => candidate === key);
}

/** The option that should hold the group's single tab stop: the selected one,
 *  or the first visible one when nothing is selected (or the selection is
 *  currently hidden). Returns undefined only when there are no options at all. */
export function getFocusableOption(
    visible: readonly number[],
    choice: number | undefined,
): number | undefined {
    return choice !== undefined && visible.includes(choice)
        ? choice
        : visible[0];
}
