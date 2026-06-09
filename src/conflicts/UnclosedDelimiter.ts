import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import type Token from '@nodes/Token';
import type Locales from '@locale/Locales';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '@conflicts/Conflict';

export default class UnclosedDelimiter extends Conflict {
    readonly open: Token;
    readonly node: Node;
    readonly expected: Token;

    constructor(node: Node, open: Token, expected: Token) {
        super(ConflictSeverity.Minor);

        this.open = open;
        this.node = node;
        this.expected = expected;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.UnparsableExpression.conflict.UnclosedDelimiter;

    getMessage() {
        return {
            node: this.open,
            explanation: (locales: Locales, context: Context) =>
                locales.concretize(
                    (l) => UnclosedDelimiter.LocalePath(l).explanation,
                    {
                        unclosed: new NodeRef(
                            this.open,
                            locales,
                            context,
                            this.open.getText(),
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
        // Append the expected close token to the unclosed parent. Most
        // delimiter-bearing nodes (ListLiteral, SetLiteral, MapLiteral,
        // Evaluate, FunctionDefinition, StructureDefinition, Block, Row,
        // SetOrMapAccess, ListAccess) have a `close` field in their grammar.
        const grammar = this.node.getGrammar();
        const hasClose = grammar.some((f) => f.name === 'close');
        if (!hasClose)
            return Conflict.fallbackExplainer(this, context, concepts);
        const closed = this.node.replace('close', this.expected);
        return [
            {
                kind: 'repair',
                description: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => UnclosedDelimiter.LocalePath(l).resolution,
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
                        [this.node, closed],
                    ]),
                    newNode: closed,
                }),
            },
        ];
    }

    getLocalePath() {
        return UnclosedDelimiter.LocalePath;
    }
}
