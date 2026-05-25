import type LocaleText from '@locale/LocaleText';
import type BinaryEvaluate from '@nodes/BinaryEvaluate';
import Block from '@nodes/Block';
import type Locales from '@locale/Locales';
import Conflict, { type Resolutions } from '@conflicts/Conflict';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';

export default class OrderOfOperations extends Conflict {
    readonly operation: BinaryEvaluate;
    readonly after: BinaryEvaluate;

    constructor(operation: BinaryEvaluate, after: BinaryEvaluate) {
        super(true);

        this.operation = operation;
        this.after = after;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.BinaryEvaluate.conflict.OrderOfOperations;

    getMessage() {
        return {
            node: this.operation,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => OrderOfOperations.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(
        _context: Context,
        _concepts: Node[],
    ): Resolutions {
        // Wrap the inner operation in a Block (parentheses) so precedence
        // is explicit.
        const grouped = Block.make([this.operation]);
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => OrderOfOperations.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.operation, grouped],
                    ]),
                    newNode: grouped,
                }),
            },
        ];
    }

    getLocalePath() {
        return OrderOfOperations.LocalePath;
    }
}
