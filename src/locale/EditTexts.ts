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
};

export default EditTexts;
