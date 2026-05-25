import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Bind from '@nodes/Bind';
import type Context from '@nodes/Context';
import Row from '@nodes/Row';
import type TableType from '@nodes/TableType';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import type Locales from '@locale/Locales';
import Conflict, { type Resolutions } from '@conflicts/Conflict';
import type Node from '@nodes/Node';

export default class MissingCell extends Conflict {
    readonly row: Row;
    readonly type: TableType;
    readonly column: Bind;

    constructor(row: Row, type: TableType, column: Bind) {
        super(false);

        this.row = row;
        this.type = type;
        this.column = column;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Row.conflict.MissingCell;

    getMessage() {
        return {
            node: this.row,
            explanation: (locales: Locales, context: Context) =>
                locales.concretize(
                    (l) => MissingCell.LocalePath(l).explanation,
                    {
                        column: new NodeRef(
                        this.column,
                        locales,
                        context,
                        locales.getName(this.column.names),
                    ),
                    },
                ),
        };
    }

    override getResolutions(
        _context: Context,
        _concepts: Node[],
    ): Resolutions {
        // Append an expression placeholder cell for the missing column.
        const placeholder = ExpressionPlaceholder.make(
            this.column.type ?? undefined,
        );
        const filled = new Row(
            this.row.open,
            [...this.row.cells, placeholder],
            this.row.close,
        );
        return [
            {
                kind: 'repair',
                description: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => MissingCell.LocalePath(l).resolution,
                        {
                            column: new NodeRef(
                                this.column,
                                locales,
                                context,
                                locales.getName(this.column.names),
                            ),
                        },
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.row, filled],
                    ]),
                    newNode: placeholder,
                }),
            },
        ];
    }

    getLocalePath() {
        return MissingCell.LocalePath;
    }
}
