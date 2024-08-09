import type Evaluate from '@nodes/Evaluate';
import Conflict from './Conflict';
import type Expression from '@nodes/Expression';
import type BinaryEvaluate from '@nodes/BinaryEvaluate';
import type StructureDefinition from '@nodes/StructureDefinition';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type StreamDefinition from '../nodes/StreamDefinition';
import type Locales from '../locale/Locales';

export default class UnexpectedInputs extends Conflict {
    readonly func: FunctionDefinition | StructureDefinition | StreamDefinition;
    readonly evaluate: Evaluate | BinaryEvaluate;
    readonly input: Expression;

    constructor(
        func: FunctionDefinition | StructureDefinition | StreamDefinition,
        evaluate: Evaluate | BinaryEvaluate,
        input: Expression,
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
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => l.node.Evaluate.conflict.UnexpectedInput.primary,
                        new NodeRef(this.input, locales, context),
                    ),
            },
            secondary: {
                node: this.func.names,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) =>
                            l.node.Evaluate.conflict.UnexpectedInput.secondary,
                        new NodeRef(this.input, locales, context),
                    ),
            },
        };
    }
}
