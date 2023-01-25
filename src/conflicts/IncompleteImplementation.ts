import type StructureDefinition from '@nodes/StructureDefinition';
import type Translation from '@translation/Translation';
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
                explanation: (translation: Translation) =>
                    translation.conflict.IncompleteImplementation.primary,
            },
        };
    }
}
