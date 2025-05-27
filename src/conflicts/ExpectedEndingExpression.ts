import type LocaleText from '@locale/LocaleText';
import type Block from '@nodes/Block';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export class ExpectedEndingExpression extends Conflict {
    readonly block: Block;

    constructor(block: Block) {
        super(false);
        this.block = block;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Block.conflict.ExpectedEndingExpression;

    getConflictingNodes() {
        return {
            primary: {
                node: this.block,
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) => ExpectedEndingExpression.LocalePath(l).primary,
                    ),
            },
        };
    }

    getLocalePath() {
        return ExpectedEndingExpression.LocalePath;
    }
}
