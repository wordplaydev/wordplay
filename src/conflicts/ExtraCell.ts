import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type Input from '@nodes/Input';
import type TableType from '@nodes/TableType';
import type Locales from '../locale/Locales';
import type Expression from '../nodes/Expression';
import Conflict from './Conflict';

export default class MissingCell extends Conflict {
    readonly cell: Expression | Input;
    readonly type: TableType;

    constructor(cell: Expression | Input, type: TableType) {
        super(false);

        this.cell = cell;
        this.type = type;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Row.conflict.MissingCell;

    getConflictingNodes() {
        return {
            primary: {
                node: this.cell,
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) => MissingCell.LocalePath(l).primary,
                    ),
            },
            secondary: {
                node: this.type,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => MissingCell.LocalePath(l).secondary,
                        new NodeRef(this.cell, locales, context),
                    ),
            },
        };
    }

    getLocalePath() {
        return MissingCell.LocalePath;
    }
}
