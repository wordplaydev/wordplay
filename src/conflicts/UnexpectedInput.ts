import Evaluate from '../nodes/Evaluate';
import Conflict from './Conflict';
import type Expression from '../nodes/Expression';
import type Bind from '../nodes/Bind';
import type BinaryOperation from '../nodes/BinaryOperation';
import type StructureDefinition from '../nodes/StructureDefinition';
import type FunctionDefinition from '../nodes/FunctionDefinition';
import type Translation from '../translations/Translation';
import NodeLink from '../translations/NodeLink';
import type Context from '../nodes/Context';

export default class UnexpectedInputs extends Conflict {
    readonly func: FunctionDefinition | StructureDefinition;
    readonly evaluate: Evaluate | BinaryOperation;
    readonly input: Expression | Bind;

    constructor(
        func: FunctionDefinition | StructureDefinition,
        evaluate: Evaluate | BinaryOperation,
        input: Expression | Bind
    ) {
        super(false);
        this.func = func;
        this.evaluate = evaluate;
        this.input = input;
    }

    getConflictingNodes() {
        return {
            primary: this.input,
            secondary: [
                this.evaluate instanceof Evaluate
                    ? this.evaluate.func
                    : this.evaluate.operator,
            ],
        };
    }

    getPrimaryExplanation(translation: Translation, context: Context) {
        return translation.conflict.UnexpectedInput.primary(
            new NodeLink(
                this.evaluate instanceof Evaluate
                    ? this.evaluate.func
                    : this.evaluate.operator,
                translation,
                context
            )
        );
    }

    getSecondaryExplanation(translation: Translation, context: Context) {
        return translation.conflict.UnexpectedInput.secondary(
            new NodeLink(this.input, translation, context)
        );
    }
}
