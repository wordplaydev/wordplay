import type LocaleText from '@locale/LocaleText';
import type StructureDefinition from '@nodes/StructureDefinition';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export class IncompleteImplementation extends Conflict {
    readonly structure: StructureDefinition;

    constructor(structure: StructureDefinition) {
        super(false);
        this.structure = structure;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.StructureDefinition.conflict.IncompleteImplementation;

    getConflictingNodes() {
        return {
            primary: {
                node: this.structure,
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) => IncompleteImplementation.LocalePath(l).primary,
                    ),
            },
        };
    }

    getLocalePath() {
        return IncompleteImplementation.LocalePath;
    }
}
