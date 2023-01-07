import type Evaluate from '../nodes/Evaluate';
import Conflict from './Conflict';
import type Bind from '../nodes/Bind';
import type BinaryOperation from '../nodes/BinaryOperation';
import type FunctionDefinition from '../nodes/FunctionDefinition';
import type StructureDefinition from '../nodes/StructureDefinition';
import type Translation from '../translations/Translation';
import type Expression from '../nodes/Expression';
import type Token from '../nodes/Token';
import type Context from '../nodes/Context';
import NodeLink from '../translations/NodeLink';

export default class MissingInput extends Conflict {
    readonly func: FunctionDefinition | StructureDefinition;
    readonly evaluate: Evaluate | BinaryOperation;
    readonly last: Token | Expression;
    readonly input: Bind;

    constructor(
        func: FunctionDefinition | StructureDefinition,
        evaluate: Evaluate | BinaryOperation,
        last: Token | Expression,
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

    getPrimaryExplanation(translation: Translation, context: Context) {
        return translation.conflict.MissingInput.primary(
            new NodeLink(this.input, translation, context)
        );
    }

    getSecondaryExplanation(translation: Translation, context: Context) {
        return translation.conflict.MissingInput.secondary(
            new NodeLink(this.evaluate, translation, context)
        );
    }
}
