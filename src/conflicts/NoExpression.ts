import Conflict from './Conflict';
import type FunctionDefinition from '../nodes/FunctionDefinition';
import type Translation from '../translations/Translation';

export default class NoExpression extends Conflict {
    readonly def: FunctionDefinition;

    constructor(def: FunctionDefinition) {
        super(true);

        this.def = def;
    }

    getConflictingNodes() {
        return { primary: this.def.names, secondary: [] };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.NoExpression.primary();
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
