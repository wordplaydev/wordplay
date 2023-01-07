import type FunctionDefinition from '../nodes/FunctionDefinition';
import type StructureDefinition from '../nodes/StructureDefinition';
import type Translation from '../translations/Translation';
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

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.Implemented.primary;
    }

    getSecondaryExplanation(translation: Translation) {
        return translation.conflict.Implemented.secondary;
    }
}
