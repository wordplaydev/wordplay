import type LocaleText from '@locale/LocaleText';
import Block from '@nodes/Block';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import type Locales from '@locale/Locales';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '@conflicts/Conflict';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';

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
