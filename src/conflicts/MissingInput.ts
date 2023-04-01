import type Evaluate from '@nodes/Evaluate';
import Conflict from './Conflict';
import type Bind from '@nodes/Bind';
import type BinaryOperation from '@nodes/BinaryOperation';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type StructureDefinition from '@nodes/StructureDefinition';
import type Translation from '@translation/Translation';
import type Expression from '@nodes/Expression';
import type Token from '@nodes/Token';
import type Context from '@nodes/Context';
import NodeLink from '@translation/NodeLink';
import type StreamDefinition from '../nodes/StreamDefinition';

export default class MissingInput extends Conflict {
    readonly func: FunctionDefinition | StructureDefinition | StreamDefinition;
    readonly evaluate: Evaluate | BinaryOperation;
    readonly last: Token | Expression;
    readonly input: Bind;

    constructor(
        func: FunctionDefinition | StructureDefinition | StreamDefinition,
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
        return {
            primary: {
                node: this.last,
                explanation: (translation: Translation, context: Context) =>
                    translation.conflict.MissingInput.primary(
                        new NodeLink(
                            this.input,
                            translation,
                            context,
                            this.input.names.getTranslation(
                                translation.language
                            )
                        )
                    ),
            },
            secondary: {
                node: this.input.names,
                explanation: (translation: Translation, context: Context) =>
                    translation.conflict.MissingInput.secondary(
                        new NodeLink(this.evaluate, translation, context)
                    ),
            },
        };
    }
}
