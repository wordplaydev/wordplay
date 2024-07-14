import type Bind from '@nodes/Bind';
import type Context from '@nodes/Context';
import NodeRef from '@locale/NodeRef';
import Conflict from './Conflict';
import type TableType from '../nodes/TableType';
import type Locales from '../locale/Locales';

export default class ExpectedColumnType extends Conflict {
    readonly table: TableType;
    readonly column: Bind;

    constructor(table: TableType, column: Bind) {
        super(false);
        this.table = table;
        this.column = column;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.table,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => l.node.TableType.conflict.ExpectedColumnType,
                        new NodeRef(this.column, locales, context),
                    ),
            },
        };
    }
}
