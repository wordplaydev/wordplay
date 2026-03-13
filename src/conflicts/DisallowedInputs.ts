import type LocaleText from '@locale/LocaleText';
import type StructureDefinition from '@nodes/StructureDefinition';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export class DisallowedInputs extends Conflict {
    readonly structure: StructureDefinition;

    constructor(structure: StructureDefinition) {
        super(false);
        this.structure = structure;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.StructureDefinition.conflict.DisallowedInputs;

    getMessage() {
        return {
            node: this.structure,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => DisallowedInputs.LocalePath(l).explanation,
                ),
        };
    }

    getLocalePath() {
        return DisallowedInputs.LocalePath;
    }
}
