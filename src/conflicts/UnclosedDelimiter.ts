import Conflict from './Conflict';
import type Node from '../nodes/Node';
import type Token from '../nodes/Token';
import type Translation from '../translations/Translation';
import NodeLink from '../translations/NodeLink';
import type Context from '../nodes/Context';

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
        return { primary: this.open, secondary: [] };
    }

    getPrimaryExplanation(translation: Translation, context: Context) {
        return translation.conflict.UnclosedDelimiter.primary(
            new NodeLink(this.open, translation, context, this.open.getText()),
            new NodeLink(
                this.expected,
                translation,
                context,
                this.expected.getText()
            )
        );
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
