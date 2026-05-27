import type LocaleText from '@locale/LocaleText';
import Bind from '@nodes/Bind';
import TypePlaceholder from '@nodes/TypePlaceholder';
import type Locales from '@locale/Locales';
import type TableType from '@nodes/TableType';
import Conflict, { type Resolutions } from '@conflicts/Conflict';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';

export default class ExpectedColumnType extends Conflict {
    readonly table: TableType;
    readonly column: Bind;

    constructor(table: TableType, column: Bind) {
        super(false);
        this.table = table;
        this.column = column;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.TableType.conflict.ExpectedColumnType;

    getMessage() {
        return {
            node: this.table,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => ExpectedColumnType.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(
        _context: Context,
        _concepts: Node[],
    ): Resolutions {
        // Add a type placeholder to the column bind.
        const c = this.column;
        const typed = new Bind(
            c.docs,
            c.share,
            c.names,
            c.etc,
            undefined,
            TypePlaceholder.make(),
            c.colon,
            c.value,
        );
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => ExpectedColumnType.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.column, typed],
                    ]),
                    newNode: typed,
                }),
            },
        ];
    }

    getLocalePath() {
        return ExpectedColumnType.LocalePath;
    }
}
