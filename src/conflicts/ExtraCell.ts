import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type Input from '@nodes/Input';
import type TableType from '@nodes/TableType';
import type Locales from '../locale/Locales';
import type Expression from '../nodes/Expression';
import Conflict from './Conflict';

export default class MissingCell extends Conflict {
    readonly cell: Expression | Input;
    readonly type: TableType;

    constructor(cell: Expression | Input, type: TableType) {
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
