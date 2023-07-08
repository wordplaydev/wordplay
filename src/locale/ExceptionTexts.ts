import type { Template } from './Locale';

type ExceptionTexts = {
    /** No inputs */
    blank: Template;
    /** $1: Name of function not found in scope */
    function: Template;
    /** $1: Scope in which name was not found */
    name: Template;
    /** $1: Borrow that it depends on */
    cycle: Template;
    /** $1: The function that was evaluated too many times */
    functionlimit: Template;
    /** No inputs */
    steplimit: Template;
    /**
     * $1 = expected type
     * $2 = received type
     */
    type: Template;
    /** No inputs */
    placeholder: Template;
    /** No inputs */
    unparsable: Template;
    /** No inputs */
    value: Template;
};

export default ExceptionTexts;
