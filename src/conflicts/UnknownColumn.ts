import type Expression from '@nodes/Expression';
import type TableType from '@nodes/TableType';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/concretize';

export default class UnknownColumn extends Conflict {
    readonly type: TableType;
    readonly cell: Expression;

    constructor(type: TableType, cell: Expression) {
        super(false);
        this.type = type;
        this.cell = cell;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.cell,
                explanation: (locale: Locale) =>
                    concretize(locale, locale.conflict.UnknownColumn),
            },
        };
    }
}
