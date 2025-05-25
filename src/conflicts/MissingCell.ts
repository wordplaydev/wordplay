import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Bind from '@nodes/Bind';
import type Context from '@nodes/Context';
import type Row from '@nodes/Row';
import type TableType from '@nodes/TableType';
import type Locales from '../locale/Locales';
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

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Row.conflict.MissingCell;

    getConflictingNodes() {
        return {
            primary: {
                node: this.row,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => MissingCell.LocalePath(l).primary,
                        new NodeRef(
                            this.column,
                            locales,
                            context,
                            locales.getName(this.column.names),
                        ),
                    ),
            },
            secondary: {
                node: this.column,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => MissingCell.LocalePath(l).secondary,
                        new NodeRef(this.row, locales, context),
                    ),
            },
        };
    }

    getLocalePath() {
        return MissingCell.LocalePath;
    }
}
