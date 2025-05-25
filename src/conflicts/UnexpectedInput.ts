import NodeRef from '@locale/NodeRef';
import type BinaryEvaluate from '@nodes/BinaryEvaluate';
import type Context from '@nodes/Context';
import type Evaluate from '@nodes/Evaluate';
import type Expression from '@nodes/Expression';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type Input from '@nodes/Input';
import type StructureDefinition from '@nodes/StructureDefinition';
import type Locales from '../locale/Locales';
import type StreamDefinition from '../nodes/StreamDefinition';
import Conflict from './Conflict';

export default class UnexpectedInput extends Conflict {
    readonly func: FunctionDefinition | StructureDefinition | StreamDefinition;
    readonly evaluate: Evaluate | BinaryEvaluate;
    readonly input: Expression | Input;

    constructor(
        func: FunctionDefinition | StructureDefinition | StreamDefinition,
        evaluate: Evaluate | BinaryEvaluate,
        input: Expression | Input,
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
