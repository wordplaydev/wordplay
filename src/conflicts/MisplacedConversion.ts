import type ConversionDefinition from '@nodes/ConversionDefinition';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';

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
                explanation: (translation: Locale) =>
                    translation.conflict.MisplacedConversion.primary,
            },
        };
    }
}
