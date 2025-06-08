import type LocaleText from '@locale/LocaleText';
import type Expression from '@nodes/Expression';
import type Input from '@nodes/Input';
import type TableType from '@nodes/TableType';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export default class UnknownColumn extends Conflict {
    readonly type: TableType;
    readonly cell: Expression | Input;

    constructor(type: TableType, cell: Expression | Input) {
        super(false);
        this.type = type;
        this.cell = cell;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Row.conflict.UnknownColumn;

    getConflictingNodes() {
        return {
            primary: {
                node: this.cell,
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) => UnknownColumn.LocalePath(l).primary,
                    ),
            },
        };
    }

    getLocalePath() {
        return UnknownColumn.LocalePath;
    }
}
