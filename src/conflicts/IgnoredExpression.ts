import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import FunctionDefinition from '@nodes/FunctionDefinition';
import UnaryEvaluate from '@nodes/UnaryEvaluate';
import type Locales from '../locale/Locales';
import Block from '../nodes/Block';
import Conflict, { type Resolution } from './Conflict';

export class IgnoredExpression extends Conflict {
    readonly block: Block;
    readonly expr: Expression;

    constructor(block: Block, expr: Expression) {
        super(true);
        this.block = block;
        this.expr = expr;
    }

    getConflictingNodes(context: Context) {
        // Is the expression after the ignored expression a unary one that, if a space were inserted, would resolve
        // to a binary function? If so, offer to insert a space.
        let unary: Resolution | undefined;
        const next =
            this.block.statements[this.block.statements.indexOf(this.expr) + 1];
        if (next instanceof UnaryEvaluate) {
            const match = this.expr
                .getType(context)
                .getDefinitionOfNameInScope(next.fun.getName(), context);
            if (
                match instanceof FunctionDefinition &&
                match.inputs.length === 1
            )
                unary = {
                    description: (locales: Locales) =>
                        locales.concretize(
                            (l) =>
                                l.node.Block.conflict.IgnoredExpression
                                    .resolution.binary,
                        ),
                    mediator: (context: Context) => {
                        const source = context.project.getSourceOf(next);
                        if (source) {
                            const operatorLeaf = next.fun.leaves()[0];
                            const firstLeaf = next.input.leaves()[0];
                            if (firstLeaf) {
                                return {
                                    newProject: context.project.withSource(
                                        source,
                                        source.withCode(
                                            source
                                                .withSpaces(
                                                    source
                                                        .getSpaces()
                                                        .withSpace(
                                                            firstLeaf,
                                                            ' ',
                                                        )
                                                        .withSpace(
                                                            operatorLeaf,
                                                            ' ',
                                                        ),
                                                )
                                                .toWordplay(),
                                        ),
                                    ),
                                };
                            }
                        }
                        return {
                            newProject: context.project,
                        };
                    },
                };
        }

        // If the expression is followed by a block with a preceding space, offer to remove the space.
        let splitEvaluate: Resolution | undefined;
        if (next instanceof Block) {
            const source = context.project.getSourceOf(next);
            if (source) {
                const firstLeaf = next.leaves()[0];
                if (firstLeaf) {
                    splitEvaluate = {
                        description: (locales: Locales) =>
                            locales.concretize(
                                (l) =>
                                    l.node.Block.conflict.IgnoredExpression
                                        .resolution.evaluate,
                            ),
                        mediator: (context: Context) => {
                            const source = context.project.getSourceOf(next);
                            if (source) {
                                return {
                                    newProject: context.project.withSource(
                                        source,
                                        source.withCode(
                                            source
                                                .withSpaces(
                                                    source
                                                        .getSpaces()
                                                        .withSpace(
                                                            firstLeaf,
                                                            '',
                                                        ),
                                                )
                                                .toWordplay(),
                                        ),
                                    ),
                                };
                            }
                            return { newProject: context.project };
                        },
                    };
                }
            }
        }
        return {
            primary: {
                node: this.block,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => l.node.Block.conflict.IgnoredExpression.primary,
                        new NodeRef(this.expr, locales, context),
                    ),
            },
            secondary: {
                node: this.expr,
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) =>
                            l.node.Block.conflict.IgnoredExpression.secondary,
                    ),
            },
            resolutions: [
                ...(unary ? [unary] : []),
                ...(splitEvaluate ? [splitEvaluate] : []),
            ],
        };
    }
}
