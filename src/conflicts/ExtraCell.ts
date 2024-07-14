import type Context from '@nodes/Context';
import type TableType from '@nodes/TableType';
import NodeRef from '@locale/NodeRef';
import Conflict from './Conflict';
import type Expression from '../nodes/Expression';
import type Locales from '../locale/Locales';

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
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) => l.node.Row.conflict.ExtraCell.primary,
                    ),
            },
            secondary: {
                node: this.type,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => l.node.Row.conflict.ExtraCell.secondary,
                        new NodeRef(this.cell, locales, context),
                    ),
            },
        };
    }
}
