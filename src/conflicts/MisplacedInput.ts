import type Evaluate from '../nodes/Evaluate';
import Conflict from './Conflict';
import type Bind from '../nodes/Bind';
import type FunctionDefinition from '../nodes/FunctionDefinition';
import type StructureDefinition from '../nodes/StructureDefinition';
import type Translation from '../translations/Translation';

export default class MisplacedInput extends Conflict {
    readonly func: FunctionDefinition | StructureDefinition;
    readonly evaluate: Evaluate;
    readonly expected: Bind;
    readonly given: Bind;

    constructor(
        func: FunctionDefinition | StructureDefinition,
        evaluate: Evaluate,
        expected: Bind,
        given: Bind
    ) {
        super(false);

        this.func = func;
        this.evaluate = evaluate;
        this.expected = expected;
        this.given = given;
    }

    getConflictingNodes() {
        return { primary: this.given.names, secondary: [] };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.MisplacedInput.primary;
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
