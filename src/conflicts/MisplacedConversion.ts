import type LocaleText from '@locale/LocaleText';
import type ConversionDefinition from '@nodes/ConversionDefinition';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export class MisplacedConversion extends Conflict {
    readonly conversion: ConversionDefinition;

    constructor(conversion: ConversionDefinition) {
        super(false);

        this.conversion = conversion;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.ConversionDefinition.conflict.MisplacedConversion;

    getConflictingNodes() {
        return {
            primary: {
                node: this.conversion,
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) => MisplacedConversion.LocalePath(l).primary,
                    ),
            },
        };
    }

    getLocalePath() {
        return MisplacedConversion.LocalePath;
    }
}
