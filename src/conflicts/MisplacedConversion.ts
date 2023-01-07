import type ConversionDefinition from '../nodes/ConversionDefinition';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export class MisplacedConversion extends Conflict {
    readonly conversion: ConversionDefinition;

    constructor(conversion: ConversionDefinition) {
        super(false);

        this.conversion = conversion;
    }

    getConflictingNodes() {
        return { primary: this.conversion, secondary: [] };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.MisplacedConversion.primary;
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
