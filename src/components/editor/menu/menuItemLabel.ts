import Menu, { RevisionSet } from '#edit/menu/Menu.ts';
import MenuAction from '#edit/menu/MenuAction.ts';
import type Revision from '#edit/revision/Revision.ts';
import type Locales from '#locale/Locales.ts';
import getPreferredSpaces from '#parser/getPreferredSpaces.ts';
import { getUnitKey, getUnitName } from './unitName.ts';

/** How long an insertion is read before it is cut short; the creator hears the
 *  rest once it is in the editor. */
const CodePreviewLength = 60;

/**
 * What a screen reader is told a menu entry is: what it would insert, then
 * what kind of thing that is. The description alone says only the type ("a
 * reference"), which doesn't distinguish one suggestion from another — the
 * code is what the creator is choosing between. One function, because the
 * label is read two ways: as the item's `aria-label` when the menu has focus,
 * and announced by the editor when a live menu keeps focus in the code.
 */
export default function menuItemLabel(
    entry: Revision | RevisionSet | MenuAction,
    locales: Locales,
): string {
    if (entry instanceof MenuAction) return entry.label(locales.getLocale());
    if (entry instanceof RevisionSet)
        return entry.getHeader(locales.getLocale());
    const edited = entry.getEditedNode(locales)[0];
    // A unit's generic description ("a unit") doesn't say which unit, so name it.
    // Primary locale only: the visible note carries the other chosen languages.
    const unit = getUnitKey(edited);
    const description =
        (unit === undefined ? undefined : getUnitName(unit, locales)) ??
        edited.getDescription(locales, entry.context).toText();
    const code = edited.toWordplay(getPreferredSpaces(edited)).trim();
    if (code.length === 0) return description;
    return locales
        .concretize((l) => l.ui.source.menu.item, {
            code:
                code.length > CodePreviewLength
                    ? `${code.slice(0, CodePreviewLength)}…`
                    : code,
            description,
        })
        .toText();
}

/** The label of a menu's current selection, if it has one. */
export function menuSelectionLabel(
    menu: Menu,
    locales: Locales,
): string | undefined {
    const selection = menu.getSelection();
    return selection === undefined
        ? undefined
        : menuItemLabel(selection, locales);
}
