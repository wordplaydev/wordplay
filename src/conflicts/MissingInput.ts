import type Evaluate from '@nodes/Evaluate';
import Conflict from './Conflict';
import type Bind from '@nodes/Bind';
import type BinaryEvaluate from '@nodes/BinaryEvaluate';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type StructureDefinition from '@nodes/StructureDefinition';
import type Expression from '@nodes/Expression';
import type Token from '@nodes/Token';
import type Context from '@nodes/Context';
import NodeRef from '@locale/NodeRef';
import type StreamDefinition from '../nodes/StreamDefinition';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

export default class MissingInput extends Conflict {
    readonly func: FunctionDefinition | StructureDefinition | StreamDefinition;
    readonly evaluate: Evaluate | BinaryEvaluate;
    readonly last: Token | Expression;
    readonly input: Bind;

    constructor(
        func: FunctionDefinition | StructureDefinition | StreamDefinition,
        evaluate: Evaluate | BinaryEvaluate,
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
        return {
            primary: {
                node: this.evaluate,
                explanation: (locales: Locales, context: Context) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) => l.node.Evaluate.conflict.MissingInput.primary
                        ),
                        new NodeRef(
                            this.input,
                            locales,
                            context,
                            locales.getName(this.input.names)
                        )
                    ),
            },
            secondary: {
                node: this.input.names,
                explanation: (locales: Locales, context: Context) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) =>
                                l.node.Evaluate.conflict.MissingInput.secondary
                        ),
                        new NodeRef(this.evaluate, locales, context)
                    ),
            },
        };
    }
}
