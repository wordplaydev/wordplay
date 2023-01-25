import type Bind from '@nodes/Bind';
import type Context from '@nodes/Context';
import type Row from '@nodes/Row';
import type TableType from '@nodes/TableType';
import NodeLink from '@translation/NodeLink';
import type Translation from '@translation/Translation';
import Conflict from './Conflict';

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
                explanation: (translation: Translation, context: Context) =>
                    translation.conflict.MissingCell.primary(
                        new NodeLink(
                            this.column,
                            translation,
                            context,
                            this.column.names.getTranslation(
                                translation.language
                            )
                        )
                    ),
            },
            secondary: {
                node: this.column,
                explanation: (translation: Translation, context: Context) =>
                    translation.conflict.MissingCell.secondary(
                        new NodeLink(this.row, translation, context)
                    ),
            },
        };
    }
}
