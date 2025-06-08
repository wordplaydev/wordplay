import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import type Token from '@nodes/Token';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export default class UnclosedDelimiter extends Conflict {
    readonly open: Token;
    readonly node: Node;
    readonly expected: Token;

    constructor(node: Node, open: Token, expected: Token) {
        super(true);

        this.open = open;
        this.node = node;
        this.expected = expected;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.UnparsableExpression.conflict.UnclosedDelimiter;

    getConflictingNodes() {
        return {
            primary: {
                node: this.open,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => UnclosedDelimiter.LocalePath(l).primary,
                        new NodeRef(
                            this.open,
                            locales,
                            context,
                            this.open.getText(),
                        ),
                        new NodeRef(
                            this.expected,
                            locales,
                            context,
                            this.expected.getText(),
                        ),
                    ),
            },
        };
    }

    getLocalePath() {
        return UnclosedDelimiter.LocalePath;
    }
}
