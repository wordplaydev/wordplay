import type ExpressionPlaceholder from '../nodes/ExpressionPlaceholder';
import type TypePlaceholder from '../nodes/TypePlaceholder';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export default class Placeholder extends Conflict {
    readonly placeholder: ExpressionPlaceholder | TypePlaceholder;

    constructor(placeholder: ExpressionPlaceholder | TypePlaceholder) {
        super(true);
        this.placeholder = placeholder;
    }

    getConflictingNodes() {
        return { primary: this.placeholder };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.Placeholder.primary;
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
