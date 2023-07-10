import Evaluate from '@nodes/Evaluate';
import Conflict from './Conflict';
import type Expression from '@nodes/Expression';
import type Bind from '@nodes/Bind';
import type BinaryOperation from '@nodes/BinaryOperation';
import type StructureDefinition from '@nodes/StructureDefinition';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type Locale from '@locale/Locale';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type StreamDefinition from '../nodes/StreamDefinition';
import concretize from '../locale/concretize';

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
                node: this.evaluate,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.node.Evaluate.conflict.UnexpectedInput.primary,
                        new NodeRef(
                            this.evaluate instanceof Evaluate
                                ? this.evaluate.func
                                : this.evaluate.operator,
                            locale,
                            context
                        )
                    ),
            },
            secondary: {
                node: this.input,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.node.Evaluate.conflict.UnexpectedInput.secondary,
                        new NodeRef(this.input, locale, context)
                    ),
            },
        };
    }
}
