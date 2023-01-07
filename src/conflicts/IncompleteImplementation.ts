import type StructureDefinition from '../nodes/StructureDefinition';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export class IncompleteImplementation extends Conflict {
    readonly structure: StructureDefinition;

    constructor(structure: StructureDefinition) {
        super(false);
        this.structure = structure;
    }

    getConflictingNodes() {
        return { primary: this.structure.names };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.IncompleteImplementation.primary;
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
