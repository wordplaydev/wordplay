import type Evaluate from '../nodes/Evaluate';
import Conflict from './Conflict';
import type Bind from '../nodes/Bind';
import type Translations from '../nodes/Translations';
import { TRANSLATE } from '../nodes/Translations';
import type StructureDefinition from '../nodes/StructureDefinition';
import type FunctionDefinition from '../nodes/FunctionDefinition';

export default class UnknownInput extends Conflict {
    readonly func: FunctionDefinition | StructureDefinition;
    readonly evaluate: Evaluate;
    readonly given: Bind;

    constructor(
        func: FunctionDefinition | StructureDefinition,
        evaluate: Evaluate,
        given: Bind
    ) {
        super(false);

        this.func = func;
        this.evaluate = evaluate;
        this.given = given;
    }

    getConflictingNodes() {
        return { primary: this.given.names, secondary: [] };
    }

    getPrimaryExplanation(): Translations {
        return {
            '😀': TRANSLATE,
            eng: `This given input doesn't correspond to any of this function's inputs.`,
        };
    }
}
