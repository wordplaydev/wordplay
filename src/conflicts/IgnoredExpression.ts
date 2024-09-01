import type Expression from '@nodes/Expression';
import Conflict, { type Resolution } from './Conflict';
import type Block from '../nodes/Block';
import type Locales from '../locale/Locales';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import UnaryEvaluate from '@nodes/UnaryEvaluate';
import FunctionDefinition from '@nodes/FunctionDefinition';

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
                                    .resolution,
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
                                    newNode: undefined,
                                };
                            }
                        }
                        return {
                            newProject: context.project,
                            newNode: undefined,
                        };
                    },
                };
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
            resolutions: unary ? [unary] : [],
        };
    }
}
