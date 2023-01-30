import type Evaluate from '@nodes/Evaluate';
import Conflict from './Conflict';
import type Bind from '@nodes/Bind';
import type StructureDefinition from '@nodes/StructureDefinition';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type Translation from '@translation/Translation';
import type StreamDefinition from '../nodes/StreamDefinition';

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
                explanation: (translation: Translation) =>
                    translation.conflict.UnknownInput.primary,
            },
        };
    }
}
