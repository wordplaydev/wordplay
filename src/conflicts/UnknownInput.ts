import type Evaluate from '@nodes/Evaluate';
import Conflict from './Conflict';
import type Bind from '@nodes/Bind';
import type StructureDefinition from '@nodes/StructureDefinition';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type Locale from '@locale/Locale';
import type StreamDefinition from '../nodes/StreamDefinition';
import concretize from '../locale/concretize';

export default class UnknownInput extends Conflict {
    readonly func: FunctionDefinition | StructureDefinition | StreamDefinition;
    readonly evaluate: Evaluate;
    readonly given: Bind;

    constructor(
        func: FunctionDefinition | StructureDefinition | StreamDefinition,
        evaluate: Evaluate,
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
                explanation: (translation: Locale) =>
                    concretize(
                        translation,
                        translation.node.Evaluate.conflict.UnknownInput.primary
                    ),
            },
            secondary: {
                node: this.given.names,
                explanation: (translation: Locale) =>
                    concretize(
                        translation,
                        translation.node.Evaluate.conflict.UnknownInput
                            .secondary
                    ),
            },
        };
    }
}
