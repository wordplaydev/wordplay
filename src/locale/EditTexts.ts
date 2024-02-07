import type { Template } from './Locale';

type EditTexts = {
    /** A way to say "on node of type [type]" */
    node: Template;
    /** A way to say "before [token], at the beginning of the program" */
    before: Template;
    /** A way to say "inside [description], between character [before|start] and [after|end]" */
    inside: Template;
    /** A way to say "between [token1] and [token2]" */
    between: Template;
    /** A way to say "empty line between [node1] and [node2]" */
    line: Template;
    /** A description of how many conflicts are at this position */
    conflicts: Template;
    /** $1: node description */
    assign: Template;
    /** $1: node description */
    append: Template;
    /** $1: node description */
    remove: Template;
    /** $1: node description or undefined */
    replace: Template;
    /** Shown in menus to offer to wrap an expression in parentheses */
    wrap: string;
    /** Shown in menus to offer to unwrap an expression in parentheses */
    unwrap: string;
    /** Shown in menus to offer to name an expression with a bind */
    bind: string;
};

export { type EditTexts as default };
