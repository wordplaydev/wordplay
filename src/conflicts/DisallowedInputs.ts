import type StructureDefinition from '@nodes/StructureDefinition';
import Conflict from './Conflict';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

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
                explanation: (locales: Locales) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) =>
                                l.node.StructureDefinition.conflict
                                    .DisallowedInputs
                        )
                    ),
            },
        };
    }
}
