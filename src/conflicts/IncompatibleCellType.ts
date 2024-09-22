import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import type TableType from '@nodes/TableType';
import type Type from '@nodes/Type';
import NodeRef from '@locale/NodeRef';
import Conflict from './Conflict';
import type Locales from '../locale/Locales';
import type Input from '@nodes/Input';

export default class IncompatibleCellType extends Conflict {
    readonly type: TableType;
    readonly cell: Expression | Input;
    readonly expected: Type;
    readonly received: Type;

    constructor(
        type: TableType,
        cell: Expression | Input,
        expected: Type,
        received: Type,
    ) {
        super(false);

        this.type = type;
        this.cell = cell;
        this.expected = expected;
        this.received = received;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.cell,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) =>
                            l.node.Update.conflict.IncompatibleCellType.primary,
                        new NodeRef(this.expected, locales, context),
                    ),
            },
            secondary: {
                node: this.type,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) =>
                            l.node.Update.conflict.IncompatibleCellType
                                .secondary,
                        new NodeRef(this.received, locales, context),
                    ),
            },
        };
    }
}
