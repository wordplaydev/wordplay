import type StructureDefinition from '@nodes/StructureDefinition';
import type Locale from '@translation/Locale';
import Conflict from './Conflict';

export class DisallowedInputs extends Conflict {
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
                    translation.conflict.DisallowedInputs.primary,
            },
        };
    }
}
