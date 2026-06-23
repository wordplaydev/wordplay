import type LocaleText from '@locale/LocaleText';
import NumberLiteral from '@nodes/NumberLiteral';
import type Locales from '@locale/Locales';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '@conflicts/Conflict';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';

export class NotANumber extends Conflict {
    readonly measurement: NumberLiteral;

    constructor(measurement: NumberLiteral) {
        super(ConflictSeverity.Error);
        this.measurement = measurement;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.NumberLiteral.conflict.NotANumber;

    getMessage() {
        return {
            node: this.measurement,
            explanation: (locales: Locales) =>
                locales.concretize((l) => NotANumber.LocalePath(l).explanation),
        };
    }

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
        // Replace the malformed literal with a real `0` (keeping the unit
        // if any). The conflict fires when the literal's value is NaN, so
        // stripping units alone wouldn't change the number text.
        const replacement = NumberLiteral.make(0, this.measurement.unit);
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => NotANumber.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.measurement, replacement],
                    ]),
                    newNode: replacement,
                }),
            },
        ];
    }

    getLocalePath() {
        return NotANumber.LocalePath;
    }
}
