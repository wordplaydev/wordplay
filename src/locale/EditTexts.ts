import type { FormattedText } from './LocaleText';

type EditTexts = {
    /** A way to say "on node of type [type]" */
    node: FormattedText;
    /** A way to say "before [token], at the beginning of the program" */
    before: FormattedText;
    /** A way to say "inside [description], between character [before|start] and [after|end]" */
    inside: FormattedText;
    /** Description of a selection range */
    range: FormattedText;
    /** A way to say "between [token1] and [token2]" */
    between: FormattedText;
    /** A way to say "empty line between [node1] and [node2]" */
    line: FormattedText;
    /** A description of how many conflicts are at this position */
    conflicts: FormattedText;
    /** $1: node description */
    assign: FormattedText;
    /** $1: node description */
    append: FormattedText;
    /** $1: node description */
    remove: FormattedText;
    /** $1: node description or undefined */
    replace: FormattedText;
    /** Shown in menus to offer to wrap an expression in parentheses */
    wrap: string;
    /** Shown in menus to offer to unwrap an expression in parentheses */
    unwrap: string;
    /** Shown in menus to offer to name an expression with a bind */
    bind: string;
    /** Show elided data structure $1 count */
    show: FormattedText;
    /** A label for the textarea in which text is typed */
    area: string;
};

export { type EditTexts as default };
