import type LocaleText from '@locale/LocaleText';
import type Row from '@nodes/Row';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export default class InvalidRow extends Conflict {
    readonly row: Row;

    constructor(row: Row) {
        super(false);
        this.row = row;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Row.conflict.InvalidRow;

    getMessage() {
        return {
            node: this.row,
            explanation: (locales: Locales) =>
                locales.concretize((l) => InvalidRow.LocalePath(l).explanation),
        };
    }

    getLocalePath() {
        return InvalidRow.LocalePath;
    }
}
