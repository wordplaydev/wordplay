import type { Template } from './Locale';

type EditTexts = {
    /** A way to say "before [description]" */
    before: Template;
    /** A way to say "inside [description]" */
    inside: Template;
    /** $1: node description */
    add: Template;
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

export default EditTexts;
