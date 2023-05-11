import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import type TableType from '@nodes/TableType';
import type Type from '@nodes/Type';
import NodeLink from '@locale/NodeLink';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';

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
                explanation: (translation: Locale, context: Context) =>
                    translation.conflict.IncompatibleCellType.primary(
                        new NodeLink(this.expected, translation, context)
                    ),
            },
            secondary: {
                node: this.type,
                explanation: (translation: Locale, context: Context) =>
                    translation.conflict.IncompatibleCellType.secondary(
                        new NodeLink(this.received, translation, context)
                    ),
            },
        };
    }
}
