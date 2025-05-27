import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Bind from '@nodes/Bind';
import type Context from '@nodes/Context';
import type Locales from '../locale/Locales';
import type TableType from '../nodes/TableType';
import Conflict from './Conflict';

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

    getConflictingNodes() {
        return {
            primary: {
                node: this.table,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => ExpectedColumnType.LocalePath(l).primary,
                        new NodeRef(this.column, locales, context),
                    ),
            },
        };
    }

    getLocalePath() {
        return ExpectedColumnType.LocalePath;
    }
}
