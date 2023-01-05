import type Expression from '../nodes/Expression';
import type Type from '../nodes/Type';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export default class IncompatibleBind extends Conflict {
    readonly expectedType: Type;
    readonly value: Expression;
    readonly valueType: Type;

    constructor(type: Type, value: Expression, valueType: Type) {
        super(false);

        this.expectedType = type;
        this.value = value;
        this.valueType = valueType;
    }

    getConflictingNodes() {
        return { primary: this.value, secondary: [this.expectedType] };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.IncompatibleBind.primary([
            this.expectedType,
            this.valueType,
        ]);
    }

    getSecondaryExplanation(translation: Translation) {
        return translation.conflict.IncompatibleBind.secondary();
    }
}
