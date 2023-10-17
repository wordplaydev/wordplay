import type Evaluate from '@nodes/Evaluate';
import Conflict from './Conflict';
import type Bind from '@nodes/Bind';
import type StructureDefinition from '@nodes/StructureDefinition';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type StreamDefinition from '../nodes/StreamDefinition';
import concretize from '../locale/concretize';
import type BinaryEvaluate from '../nodes/BinaryEvaluate';
import type Locales from '../locale/Locales';

export default class UnknownInput extends Conflict {
    readonly func: FunctionDefinition | StructureDefinition | StreamDefinition;
    readonly evaluate: Evaluate | BinaryEvaluate;
    readonly given: Bind;

    constructor(
        func: FunctionDefinition | StructureDefinition | StreamDefinition,
        evaluate: Evaluate | BinaryEvaluate,
        given: Bind
    ) {
        super(false);

        this.func = func;
        this.evaluate = evaluate;
        this.given = given;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.given.names,
                explanation: (locales: Locales) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) => l.node.Evaluate.conflict.UnknownInput.primary
                        )
                    ),
            },
            secondary: {
                node: this.given.names,
                explanation: (locales: Locales) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) =>
                                l.node.Evaluate.conflict.UnknownInput.secondary
                        )
                    ),
            },
        };
    }
}
