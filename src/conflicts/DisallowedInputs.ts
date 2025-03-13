import type StructureDefinition from '@nodes/StructureDefinition';
import type Locales from '../locale/Locales';
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
                node: this.structure,
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) =>
                            l.node.StructureDefinition.conflict
                                .DisallowedInputs,
                    ),
            },
        };
    }
}
