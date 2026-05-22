import type LocaleText from '@locale/LocaleText';
import type Bind from '@nodes/Bind';
import type Locales from '@locale/Locales';
import type TableType from '@nodes/TableType';
import Conflict from '@conflicts/Conflict';

export default class ExpectedColumnType extends Conflict {
    readonly table: TableType;
    readonly column: Bind;

    constructor(table: TableType, column: Bind) {
        super(false);
        this.table = table;
        this.column = column;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.TableType.conflict.ExpectedColumnType;

    getMessage() {
        return {
            node: this.table,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => ExpectedColumnType.LocalePath(l).explanation,
                ),
        };
    }

    getLocalePath() {
        return ExpectedColumnType.LocalePath;
    }
}
