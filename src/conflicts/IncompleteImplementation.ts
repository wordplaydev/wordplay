import type StructureDefinition from '@nodes/StructureDefinition';
import Conflict from './Conflict';
import type Locales from '../locale/Locales';

export class IncompleteImplementation extends Conflict {
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
                                .IncompleteImplementation,
                    ),
            },
        };
    }
}
