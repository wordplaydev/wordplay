import type MeasurementLiteral from '@nodes/MeasurementLiteral';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/concretize';

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
                    concretize(
                        translation,
                        translation.node.MeasurementLiteral.conflict.NotANumber
                    ),
            },
        };
    }
}
