import type LocaleText from '@locale/LocaleText';
import type Locales from '@locale/Locales';
import type Bind from '@nodes/Bind';
import type TableLiteral from '@nodes/TableLiteral';
import Conflict from '@conflicts/Conflict';

export default class UnexpectedColumnBind extends Conflict {
    readonly expression: TableLiteral;
    readonly cell: Bind;

    constructor(literal: TableLiteral, cell: Bind) {
        super(false);
        this.expression = literal;
        this.cell = cell;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Row.conflict.UnexpectedColumnBind;

    getMessage() {
        return {
            node: this.expression,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => UnexpectedColumnBind.LocalePath(l).explanation,
                ),
        };
    }

    getLocalePath() {
        return UnexpectedColumnBind.LocalePath;
    }
}
