import type LocaleText from '#locale/LocaleText.ts';
import Block from '#nodes/Block.ts';
import ExpressionPlaceholder from '#nodes/ExpressionPlaceholder.ts';
import type Locales from '#locale/Locales.ts';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '#conflicts/Conflict.ts';
import type Context from '#nodes/Context.ts';
import type Node from '#nodes/Node.ts';

export class ExpectedEndingExpression extends Conflict {
    readonly block: Block;

    constructor(block: Block) {
        super(ConflictSeverity.Error);
        this.block = block;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Block.conflict.ExpectedEndingExpression;

    getMessage() {
        return {
            node: this.block,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => ExpectedEndingExpression.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
        // Append an expression placeholder to the block.
        const placeholder = ExpressionPlaceholder.make();
        const b = this.block;
        const filled = new Block(
            [...b.statements, placeholder],
            b.kind,
            b.open,
            b.close,
            b.docs,
        );
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) =>
                            ExpectedEndingExpression.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.block, filled],
                    ]),
                    newNode: placeholder,
                }),
            },
        ];
    }

    getLocalePath() {
        return ExpectedEndingExpression.LocalePath;
    }
}
