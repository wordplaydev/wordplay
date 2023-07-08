import type { Template } from './Locale';

type EvaluationTexts = {
    done: Template;
    unevaluated: Template;
    stream: Template;
    jump: Template;
    /** $1: true if jumping */
    jumpif: Template;
    halt: Template;
    initialize: Template;
    evaluate: Template;
    next: Template;
    check: Template;
};

export default EvaluationTexts;
