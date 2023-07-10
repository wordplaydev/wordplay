import type StructureDefinition from '@nodes/StructureDefinition';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/concretize';

export class DisallowedInputs extends Conflict {
    readonly structure: StructureDefinition;

    constructor(structure: StructureDefinition) {
        super(false);
        this.structure = structure;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.structure,
                explanation: (locale: Locale) =>
                    concretize(
                        locale,
                        locale.node.StructureDefinition.conflict
                            .DisallowedInputs
                    ),
            },
        };
    }
}
