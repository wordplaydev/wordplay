import UnclosedDelimiter from '#conflicts/UnclosedDelimiter.ts';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '#conflicts/Conflict.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type Locales from '#locale/Locales.ts';
import NodeRef from '#locale/NodeRef.ts';
import type Context from '#nodes/Context.ts';
import type Node from '#nodes/Node.ts';
import type Token from '#nodes/Token.ts';

/**
 * A closing delimiter with nothing that opened it. The other half of
 * {@link UnclosedDelimiter}, and reported on the close, since that is what there is to see.
 *
 * Its node is what recovery took the close to end: a list, a block, some text, whose `open`
 * is a token with no text, standing where layout says the missing delimiter belongs. That is
 * what lets everything inside it be read as what it is, rather than as whatever it would be
 * with nothing around it.
 */
export default class UnopenedDelimiter extends Conflict {
    readonly node: Node;
    readonly close: Token;
    readonly expected: Token;

    constructor(node: Node, close: Token, expected: Token) {
        // Like an unclosed delimiter, this is the cause of what else its node reports.
        super(ConflictSeverity.Warning);

        this.node = node;
        this.close = close;
        this.expected = expected;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.UnparsableExpression.conflict.UnopenedDelimiter;

    getMessage() {
        return {
            node: this.close,
            explanation: (locales: Locales, context: Context) =>
                locales.concretize(
                    (l) => UnopenedDelimiter.LocalePath(l).explanation,
                    {
                        unopened: new NodeRef(
                            this.close,
                            locales,
                            context,
                            this.close.getText(),
                        ),
                        expected: new NodeRef(
                            this.expected,
                            locales,
                            context,
                            this.expected.getText(),
                        ),
                    },
                ),
        };
    }

    override getResolutions(context: Context, concepts: Node[]): Resolutions {
        // Put the expected delimiter where the empty one stands.
        const grammar = this.node.getGrammar();
        if (!grammar.some((field) => field.name === 'open'))
            return Conflict.fallbackExplainer(this, context, concepts);
        const opened = this.node.replace('open', this.expected);
        return [
            {
                kind: 'repair',
                description: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => UnopenedDelimiter.LocalePath(l).resolution,
                        {
                            expected: new NodeRef(
                                this.expected,
                                locales,
                                context,
                                this.expected.getText(),
                            ),
                        },
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.node, opened],
                    ]),
                    newNode: opened,
                }),
            },
        ];
    }

    getLocalePath() {
        return UnopenedDelimiter.LocalePath;
    }
}

/**
 * What a node's pair of delimiters has to say for itself: that it was never closed, or
 * that it was never opened, which is when recovery stood a token with no text where its
 * opening one belongs. Asked by every node that has a pair, so that what counts as either
 * is decided once. The expected delimiters are made only if there is something to report.
 */
export function getDelimiterConflicts(
    node: Node,
    open: Token | undefined,
    close: Token | undefined,
    opening: () => Token,
    closing: () => Token,
): Conflict[] {
    if (open === undefined) return [];
    if (close === undefined)
        return [new UnclosedDelimiter(node, open, closing())];
    return open.getText() === ''
        ? [new UnopenedDelimiter(node, close, opening())]
        : [];
}
