import type FunctionDefinition from '../nodes/FunctionDefinition';
import type StructureDefinition from '../nodes/StructureDefinition';
import type Translations from '../nodes/Translations';
import { TRANSLATE } from '../nodes/Translations';
import Conflict from './Conflict';

export class Implemented extends Conflict {
    readonly structure: StructureDefinition;
    readonly functions: FunctionDefinition[];

    constructor(
        structure: StructureDefinition,
        functions: FunctionDefinition[]
    ) {
        super(false);
        this.structure = structure;
        this.functions = functions;
    }

    getConflictingNodes() {
        return { primary: this.structure.names, secondary: this.functions };
    }

    getPrimaryExplanation(): Translations {
        return {
            '😀': TRANSLATE,
            eng: `Structures that don't implement some functions can't implement others.`,
        };
    }
}
