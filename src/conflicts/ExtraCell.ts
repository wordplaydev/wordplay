import type LocaleText from '#locale/LocaleText.ts';
import type Input from '#nodes/Input.ts';
import type TableType from '#nodes/TableType.ts';
import type Locales from '#locale/Locales.ts';
import type Expression from '#nodes/Expression.ts';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '#conflicts/Conflict.ts';
import type Context from '#nodes/Context.ts';
import type Node from '#nodes/Node.ts';

export default class ExtraCell extends Conflict {
    readonly cell: Expression | Input;
    readonly type: TableType;

    constructor(cell: Expression | Input, type: TableType) {
        super(ConflictSeverity.Error);

        this.cell = cell;
        this.type = type;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Row.conflict.ExtraCell;

    getMessage() {
        return {
            node: this.cell,
            explanation: (locales: Locales) =>
                locales.concretize((l) => ExtraCell.LocalePath(l).explanation),
        };
    }

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
        // Remove the extra cell from its row.
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => ExtraCell.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.cell, undefined],
                    ]),
                }),
            },
        ];
    }

    getLocalePath() {
        return ExtraCell.LocalePath;
    }
}
