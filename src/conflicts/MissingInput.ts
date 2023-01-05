import type Evaluate from '../nodes/Evaluate';
import Conflict from './Conflict';
import type Node from '../nodes/Node';
import type Bind from '../nodes/Bind';
import type BinaryOperation from '../nodes/BinaryOperation';
import type FunctionDefinition from '../nodes/FunctionDefinition';
import type StructureDefinition from '../nodes/StructureDefinition';
import type Translation from '../translations/Translation';

export default class MissingInput extends Conflict {
    readonly func: FunctionDefinition | StructureDefinition;
    readonly evaluate: Evaluate | BinaryOperation;
    readonly last: Node;
    readonly input: Bind;

    constructor(
        func: FunctionDefinition | StructureDefinition,
        evaluate: Evaluate | BinaryOperation,
        last: Node,
        expected: Bind
    ) {
        super(false);
        this.func = func;
        this.evaluate = evaluate;
        this.last = last;
        this.input = expected;
    }

    getConflictingNodes() {
        return { primary: this.last, secondary: [this.input.names] };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.MissingInput.primary(this.input);
    }

    getSecondaryExplanation(translation: Translation) {
        return translation.conflict.MissingInput.secondary();
    }
}
