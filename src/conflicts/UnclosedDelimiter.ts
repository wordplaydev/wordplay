import Conflict from './Conflict';
import type Node from '@nodes/Node';
import type Token from '@nodes/Token';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

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

    getConflictingNodes() {
        return {
            primary: {
                node: this.open,
                explanation: (locales: Locales, context: Context) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) =>
                                l.node.UnparsableExpression.conflict
                                    .UnclosedDelimiter
                        ),
                        new NodeRef(
                            this.open,
                            locales,
                            context,
                            this.open.getText()
                        ),
                        new NodeRef(
                            this.expected,
                            locales,
                            context,
                            this.expected.getText()
                        )
                    ),
            },
        };
    }
}
