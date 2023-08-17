import type Context from '@nodes/Context';
import type TableType from '@nodes/TableType';
import NodeRef from '@locale/NodeRef';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/concretize';
import type Expression from '../nodes/Expression';

export default class MissingCell extends Conflict {
    readonly cell: Expression;
    readonly type: TableType;

    constructor(cell: Expression, type: TableType) {
        super(false);

        this.cell = cell;
        this.type = type;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.cell,
                explanation: (locale: Locale) =>
                    concretize(
                        locale,
                        locale.node.Row.conflict.ExtraCell.primary
                    ),
            },
            secondary: {
                node: this.type,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.node.Row.conflict.ExtraCell.secondary,
                        new NodeRef(this.cell, locale, context)
                    ),
            },
        };
    }
}
