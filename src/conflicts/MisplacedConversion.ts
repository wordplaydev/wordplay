import type ConversionDefinition from '@nodes/ConversionDefinition';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/concretize';

export class MisplacedConversion extends Conflict {
    readonly conversion: ConversionDefinition;

    constructor(conversion: ConversionDefinition) {
        super(false);

        this.conversion = conversion;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.conversion,
                explanation: (locale: Locale) =>
                    concretize(locale, locale.conflict.MisplacedConversion),
            },
        };
    }
}
