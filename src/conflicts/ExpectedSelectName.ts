import type LocaleText from '@locale/LocaleText';
import type Expression from '@nodes/Expression';
import type Input from '@nodes/Input';
import type Locales from '@locale/Locales';
import type Select from '@nodes/Select';
import Conflict from '@conflicts/Conflict';

export default class ExpectedSelectName extends Conflict {
    readonly select: Select;
    readonly cell: Expression | Input;

    constructor(select: Select, cell: Expression | Input) {
        super(false);

        this.select = select;
        this.cell = cell;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Select.conflict.ExpectedSelectName;

    getMessage() {
        return {
            node: this.select,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => ExpectedSelectName.LocalePath(l).explanation,
                ),
        };
    }

    getLocalePath() {
        return ExpectedSelectName.LocalePath;
    }
}
