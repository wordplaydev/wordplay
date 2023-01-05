import type MeasurementLiteral from '../nodes/MeasurementLiteral';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export class NotANumber extends Conflict {
    readonly measurement: MeasurementLiteral;

    constructor(measurement: MeasurementLiteral) {
        super(false);
        this.measurement = measurement;
    }

    getConflictingNodes() {
        return { primary: this.measurement, secondary: [] };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.NotANumber.primary();
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
