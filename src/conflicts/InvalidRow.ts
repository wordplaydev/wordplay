import type LocaleText from '@locale/LocaleText';
import Row from '@nodes/Row';
import type Locales from '@locale/Locales';
import Conflict, {
    ConflictSeverity,
    type Repair,
    type Resolutions,
} from '@conflicts/Conflict';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import Input from '@nodes/Input';

export default class InvalidRow extends Conflict {
    readonly row: Row;

    constructor(row: Row) {
        super(ConflictSeverity.Error);
        this.row = row;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Row.conflict.InvalidRow;

    getMessage() {
        return {
            node: this.row,
            explanation: (locales: Locales) =>
                locales.concretize((l) => InvalidRow.LocalePath(l).explanation),
        };
    }

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
        // The conflict fires when a row mixes positional and named cells.
        // Offer two repairs: keep only the positionals, or unwrap the named
        // cells to their values (making them positional too).
        const positionalOnly = new Row(
            this.row.open,
            this.row.cells.filter((c) => !(c instanceof Input)),
            this.row.close,
        );
        const allPositional = new Row(
            this.row.open,
            this.row.cells.map((c) => (c instanceof Input ? c.value : c)),
            this.row.close,
        );
        const repairs: Repair[] = [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) =>
                            InvalidRow.LocalePath(l).resolutionKeepPositional,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.row, positionalOnly],
                    ]),
                    newNode: positionalOnly,
                }),
            },
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => InvalidRow.LocalePath(l).resolutionUnwrapInputs,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.row, allPositional],
                    ]),
                    newNode: allPositional,
                }),
            },
        ];
        return repairs as readonly Repair[] as Resolutions;
    }

    getLocalePath() {
        return InvalidRow.LocalePath;
    }
}
