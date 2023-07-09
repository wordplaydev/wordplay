import Conflict from './Conflict';
import type Node from '@nodes/Node';
import type Token from '@nodes/Token';
import type Locale from '@locale/Locale';
import NodeLink from '@locale/NodeRef';
import type Context from '@nodes/Context';
import concretize from '../locale/concretize';

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
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.conflict.UnclosedDelimiter,
                        new NodeLink(
                            this.open,
                            locale,
                            context,
                            this.open.getText()
                        ),
                        new NodeLink(
                            this.expected,
                            locale,
                            context,
                            this.expected.getText()
                        )
                    ),
            },
        };
    }
}
