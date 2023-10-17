import type Evaluate from '@nodes/Evaluate';
import Conflict from './Conflict';
import type Expression from '@nodes/Expression';
import type Bind from '@nodes/Bind';
import type BinaryEvaluate from '@nodes/BinaryEvaluate';
import type StructureDefinition from '@nodes/StructureDefinition';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type StreamDefinition from '../nodes/StreamDefinition';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

export default class UnexpectedInputs extends Conflict {
    readonly func: FunctionDefinition | StructureDefinition | StreamDefinition;
    readonly evaluate: Evaluate | BinaryEvaluate;
    readonly input: Expression | Bind;

    constructor(
        func: FunctionDefinition | StructureDefinition | StreamDefinition,
        evaluate: Evaluate | BinaryEvaluate,
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
                explanation: (locales: Locales, context: Context) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) =>
                                l.node.Evaluate.conflict.UnexpectedInput.primary
                        ),
                        new NodeRef(this.input, locales, context)
                    ),
            },
            secondary: {
                node: this.input,
                explanation: (locales: Locales, context: Context) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) =>
                                l.node.Evaluate.conflict.UnexpectedInput
                                    .secondary
                        ),
                        new NodeRef(this.input, locales, context)
                    ),
            },
        };
    }
}
