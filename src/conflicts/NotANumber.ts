import type MeasurementLiteral from '@nodes/MeasurementLiteral';
import type Locale from '@translation/Locale';
import Conflict from './Conflict';

export class NotANumber extends Conflict {
    readonly measurement: MeasurementLiteral;

    constructor(measurement: MeasurementLiteral) {
        super(false);
        this.measurement = measurement;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.measurement,
                explanation: (translation: Locale) =>
                    translation.conflict.NotANumber.primary,
            },
        };
    }
}
