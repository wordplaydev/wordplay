import type Bind from '@nodes/Bind';
import type Context from '@nodes/Context';
import type Row from '@nodes/Row';
import type TableType from '@nodes/TableType';
import NodeLink from '@locale/NodeLink';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/locales/concretize';

export default class MissingCell extends Conflict {
    readonly row: Row;
    readonly type: TableType;
    readonly column: Bind;

    constructor(row: Row, type: TableType, column: Bind) {
        super(false);

        this.row = row;
        this.type = type;
        this.column = column;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.row,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.conflict.MissingCell.primary,
                        new NodeLink(
                            this.column,
                            locale,
                            context,
                            this.column.names.getLocaleText(locale.language)
                        )
                    ),
            },
            secondary: {
                node: this.column,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.conflict.MissingCell.secondary,
                        new NodeLink(this.row, locale, context)
                    ),
            },
        };
    }
}
