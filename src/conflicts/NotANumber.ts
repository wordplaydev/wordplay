import type LocaleText from '@locale/LocaleText';
import type NumberLiteral from '@nodes/NumberLiteral';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export class NotANumber extends Conflict {
    readonly measurement: NumberLiteral;

    constructor(measurement: NumberLiteral) {
        super(false);
        this.measurement = measurement;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.NumberLiteral.conflict.NotANumber;

    getConflictingNodes() {
        return {
            primary: {
                node: this.measurement,
                explanation: (locales: Locales) =>
                    locales.concretize((l) => NotANumber.LocalePath(l).primary),
            },
        };
    }

    getLocalePath() {
        return NotANumber.LocalePath;
    }
}
