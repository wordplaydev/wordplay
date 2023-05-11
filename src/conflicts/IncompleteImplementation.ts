import type StructureDefinition from '@nodes/StructureDefinition';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';

export class IncompleteImplementation extends Conflict {
    readonly structure: StructureDefinition;

    constructor(structure: StructureDefinition) {
        super(false);
        this.structure = structure;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.structure.names,
                explanation: (translation: Locale) =>
                    translation.conflict.IncompleteImplementation.primary,
            },
        };
    }
}
