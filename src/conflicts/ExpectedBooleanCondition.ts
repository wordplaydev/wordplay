import type Conditional from '../nodes/Conditional';
import type Type from '../nodes/Type';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export default class ExpectedBooleanCondition extends Conflict {
    readonly conditional: Conditional;
    readonly type: Type;

    constructor(conditional: Conditional, type: Type) {
        super(false);

        this.conditional = conditional;
        this.type = type;
    }

    getConflictingNodes() {
        return { primary: this.conditional.condition, secondary: [] };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.ExpectedBooleanCondition.primary(this.type);
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
