import type Evaluate from '@nodes/Evaluate';
import Conflict from './Conflict';
import type Bind from '@nodes/Bind';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type StructureDefinition from '@nodes/StructureDefinition';
import type StreamDefinition from '../nodes/StreamDefinition';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

export default class MisplacedInput extends Conflict {
    readonly func: FunctionDefinition | StructureDefinition | StreamDefinition;
    readonly evaluate: Evaluate;
    readonly expected: Bind;
    readonly given: Bind;

    constructor(
        func: FunctionDefinition | StructureDefinition | StreamDefinition,
        evaluate: Evaluate,
        expected: Bind,
        given: Bind
    ) {
        super(false);

        this.func = func;
        this.evaluate = evaluate;
        this.expected = expected;
        this.given = given;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.evaluate,
                explanation: (locales: Locales) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) => l.node.Evaluate.conflict.MisplacedInput
                        )
                    ),
            },
        };
    }
}
