import type Expression from '@nodes/Expression';
import type TableType from '@nodes/TableType';
import Conflict from './Conflict';
import type Locales from '../locale/Locales';
import type Input from '@nodes/Input';

export default class UnknownColumn extends Conflict {
    readonly type: TableType;
    readonly cell: Expression | Input;

    constructor(type: TableType, cell: Expression | Input) {
        super(false);
        this.type = type;
        this.cell = cell;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.cell,
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) => l.node.Row.conflict.UnknownColumn,
                    ),
            },
        };
    }
}
