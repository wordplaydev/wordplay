import type Evaluate from '../nodes/Evaluate';
import type FunctionDefinition from '../nodes/FunctionDefinition';
import type StructureDefinition from '../nodes/StructureDefinition';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export default class NotInstantiable extends Conflict {
    readonly evaluate: Evaluate;
    readonly definition: StructureDefinition;
    readonly abstractFunctions: FunctionDefinition[];

    constructor(
        evaluate: Evaluate,
        definition: StructureDefinition,
        abstractFunctions: FunctionDefinition[]
    ) {
        super(false);

        this.evaluate = evaluate;
        this.definition = definition;
        this.abstractFunctions = abstractFunctions;
    }

    getConflictingNodes() {
        return {
            primary: this.evaluate.func,
            secondary: this.abstractFunctions.map((f) => f.names),
        };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.NotInstantiable.primary();
    }

    getSecondaryExplanation(translation: Translation) {
        return translation.conflict.NotInstantiable.secondary();
    }
}
