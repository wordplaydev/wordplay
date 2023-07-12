import type NumberLiteral from '@nodes/NumberLiteral';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/concretize';

export class NotANumber extends Conflict {
    readonly measurement: NumberLiteral;

    constructor(measurement: NumberLiteral) {
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
                        translation.node.NumberLiteral.conflict.NotANumber
                    ),
            },
        };
    }
}
