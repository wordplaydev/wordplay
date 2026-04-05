import type { FormattedText } from './LocaleText';

type EditTexts = {
    /** [formatted] A way to say "on node of type [type]" */
    node: FormattedText;
    /** [formatted] A way to say "before [token], at the beginning of the program" */
    before: FormattedText;
    /** [formatted] A way to say "inside [description], between character [before|start] and [after|end]" */
    inside: FormattedText;
    /** [formatted] Description of a selection range */
    range: FormattedText;
    /** [formatted] A way to say "between [token1] and [token2]" */
    between: FormattedText;
    /** [formatted] A way to say "empty line between [node1] and [node2]" */
    line: FormattedText;
    /** [formatted] A description of how many conflicts are at this position */
    conflicts: FormattedText;
    /** [formatted] $1: node description */
    assign: FormattedText;
    /** [formatted] $1: node description */
    append: FormattedText;
    /** [formatted] $1: node description */
    remove: FormattedText;
    /** [formatted] $1: node description or undefined */
    replace: FormattedText;
    /** [plain] Shown in menus to offer to wrap an expression in parentheses */
    wrap: string;
    /** [plain] Shown in menus to offer to unwrap an expression in parentheses */
    unwrap: string;
    /** [plain] Shown in menus to offer to name an expression with a bind */
    bind: string;
    /** [formatted] Show elided data structure $1 count */
    show: FormattedText;
    /** [plain] A label for the textarea in which text is typed */
    area: string;
};

export { type EditTexts as default };
