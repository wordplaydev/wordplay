import type Bind from '@nodes/Bind';
import type Context from '@nodes/Context';
import NodeLink from '@locale/NodeRef';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/concretize';
import type TableType from '../nodes/TableType';

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
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.node.TableType.conflict.ExpectedColumnType,
                        new NodeLink(this.column, locale, context)
                    ),
            },
        };
    }
}
