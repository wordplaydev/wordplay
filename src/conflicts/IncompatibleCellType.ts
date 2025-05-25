import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import type Input from '@nodes/Input';
import type TableType from '@nodes/TableType';
import type Type from '@nodes/Type';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

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

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Update.conflict.IncompatibleCellType;

    getConflictingNodes() {
        return {
            primary: {
                node: this.cell,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => IncompatibleCellType.LocalePath(l).primary,
                        new NodeRef(this.expected, locales, context),
                    ),
            },
            secondary: {
                node: this.type,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => IncompatibleCellType.LocalePath(l).secondary,
                        new NodeRef(this.received, locales, context),
                    ),
            },
        };
    }

    getLocalePath() {
        return IncompatibleCellType.LocalePath;
    }
}
