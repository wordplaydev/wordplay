import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import type Input from '@nodes/Input';
import type Locales from '../locale/Locales';
import type Select from '../nodes/Select';
import Conflict from './Conflict';

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

    getConflictingNodes() {
        return {
            primary: {
                node: this.select,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => ExpectedSelectName.LocalePath(l).primary,
                        new NodeRef(this.cell, locales, context),
                    ),
            },
        };
    }

    getLocalePath() {
        return ExpectedSelectName.LocalePath;
    }
}
