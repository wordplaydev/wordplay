import Evaluate from '@nodes/Evaluate';
import Conflict from './Conflict';
import type Expression from '@nodes/Expression';
import type Bind from '@nodes/Bind';
import type BinaryOperation from '@nodes/BinaryOperation';
import type StructureDefinition from '@nodes/StructureDefinition';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type Translation from '@translation/Translation';
import NodeLink from '@translation/NodeLink';
import type Context from '@nodes/Context';
import type StreamDefinition from '../nodes/StreamDefinition';

export default class UnexpectedInputs extends Conflict {
    readonly func: FunctionDefinition | StructureDefinition | StreamDefinition;
    readonly evaluate: Evaluate | BinaryOperation;
    readonly input: Expression | Bind;

    constructor(
        func: FunctionDefinition | StructureDefinition | StreamDefinition,
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
            primary: {
                node: this.input,
                explanation: (translation: Translation, context: Context) =>
                    translation.conflict.UnexpectedInput.primary(
                        new NodeLink(
                            this.evaluate instanceof Evaluate
                                ? this.evaluate.func
                                : this.evaluate.operator,
                            translation,
                            context
                        )
                    ),
            },
            secondary: {
                node:
                    this.evaluate instanceof Evaluate
                        ? this.evaluate.func
                        : this.evaluate.operator,
                explanation: (translation: Translation, context: Context) =>
                    translation.conflict.UnexpectedInput.secondary(
                        new NodeLink(this.input, translation, context)
                    ),
            },
        };
    }
}
