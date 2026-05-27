import type LocaleText from '@locale/LocaleText';
import type Expression from '@nodes/Expression';
import Input from '@nodes/Input';
import type Locales from '@locale/Locales';
import type Update from '@nodes/Update';
import Conflict, { type Resolutions } from '@conflicts/Conflict';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import TableType from '@nodes/TableType';

export default class ExpectedColumnBind extends Conflict {
    readonly update: Update;
    readonly cell: Expression;

    constructor(update: Update, cell: Expression) {
        super(false);
        this.update = update;
        this.cell = cell;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Update.conflict.ExpectedColumnBind;

    getMessage() {
        return {
            node: this.update,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => ExpectedColumnBind.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(
        context: Context,
        _concepts: Node[],
    ): Resolutions {
        // Wrap the cell as `<column>: value`. We need a column name from the
        // Update's underlying table type to make the new Input refer to a
        // real column; otherwise the rename leaves an UnknownColumn behind.
        const tableType = this.update.table.getType(context);
        const columns =
            tableType instanceof TableType ? tableType.columns : [];
        const usedNames = new Set(
            this.update.row.cells
                .filter((c) => c instanceof Input)
                .map((c) => (c as Input).getName()),
        );
        const targetColumn = columns.find(
            (c) =>
                c.names.names[0] &&
                !usedNames.has(c.names.names[0].getName() ?? ''),
        );
        const columnName =
            targetColumn?.names.names[0]?.getName() ??
            columns[0]?.names.names[0]?.getName();
        // If there's no inferable column, fall through to the generic
        // explainer rather than producing an obviously-wrong rename.
        if (columnName === undefined)
            return Conflict.fallbackExplainer(this, context, _concepts);
        const wrapped = Input.make(columnName, this.cell);
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => ExpectedColumnBind.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.cell, wrapped],
                    ]),
                    newNode: wrapped,
                }),
            },
        ];
    }

    getLocalePath() {
        return ExpectedColumnBind.LocalePath;
    }
}
