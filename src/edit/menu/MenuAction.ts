import type LocaleText from '@locale/LocaleText';

/**
 * Something the menu can *do* to the selected node, as opposed to something it
 * can change the node into.
 *
 * Deliberately not a `Revision`. Every revision answers a purpose, a removal and
 * a completion, and is round-tripped through the parser by `soundRevisions`
 * before it is offered — none of which means anything for an action, which
 * changes no code. Keeping it a separate type is what lets the menu's grouping
 * stay exactly as it was: it still only ever sees revisions.
 */
export default class MenuAction {
    /** Stable and locale-independent, so a test can name one. */
    readonly id: string;

    /** What the row says. A string rather than a `Markup` because an action has
     *  no code to preview — the words are the whole item. */
    readonly label: (locale: LocaleText) => string;

    readonly execute: () => void;

    constructor(
        id: string,
        label: (locale: LocaleText) => string,
        execute: () => void,
    ) {
        this.id = id;
        this.label = label;
        this.execute = execute;
    }
}
