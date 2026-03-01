import type LocaleText from '@locale/LocaleText';
import type Input from '@nodes/Input';
import type TableType from '@nodes/TableType';
import type Locales from '../locale/Locales';
import type Expression from '../nodes/Expression';
import Conflict from './Conflict';

export default class ExtraCell extends Conflict {
    readonly cell: Expression | Input;
    readonly type: TableType;

    constructor(cell: Expression | Input, type: TableType) {
        super(false);

        this.cell = cell;
        this.type = type;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Row.conflict.ExtraCell;

    getMessage() {
        return {
            node: this.cell,
            explanation: (locales: Locales) =>
                locales.concretize((l) => ExtraCell.LocalePath(l).explanation),
        };
    }

    getLocalePath() {
        return ExtraCell.LocalePath;
    }
}
