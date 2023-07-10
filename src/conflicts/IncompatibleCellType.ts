import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import type TableType from '@nodes/TableType';
import type Type from '@nodes/Type';
import NodeRef from '@locale/NodeRef';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/concretize';

export default class IncompatibleCellType extends Conflict {
    readonly type: TableType;
    readonly cell: Expression;
    readonly expected: Type;
    readonly received: Type;

    constructor(
        type: TableType,
        cell: Expression,
        expected: Type,
        received: Type
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
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.node.Update.conflict.IncompatibleCellType
                            .primary,
                        new NodeRef(this.expected, locale, context)
                    ),
            },
            secondary: {
                node: this.type,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.node.Update.conflict.IncompatibleCellType
                            .secondary,
                        new NodeRef(this.received, locale, context)
                    ),
            },
        };
    }
}
