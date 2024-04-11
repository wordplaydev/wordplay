import Conflict, { type Resolution } from './Conflict';
import type UnparsableType from '@nodes/UnparsableType';
import UnparsableExpression from '@nodes/UnparsableExpression';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';
import type Context from '@nodes/Context';
import Expression from '@nodes/Expression';
import parseExpression from '@parser/parseExpression';
import { toTokens } from '@parser/toTokens';
import { Any, IsA } from '@nodes/Node';
import Token from '@nodes/Token';
import NodeRef from '@locale/NodeRef';

export class UnparsableConflict extends Conflict {
    readonly unparsable: UnparsableType | UnparsableExpression;
    readonly context: Context;

    constructor(
        unparsable: UnparsableType | UnparsableExpression,
        context: Context,
    ) {
        super(false);
        this.unparsable = unparsable;
        this.context = context;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.unparsable,
                explanation: (locales: Locales) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) =>
                                l.node.UnparsableExpression.conflict
                                    .UnparsableConflict.conflict,
                        ),
                        this.unparsable instanceof UnparsableExpression,
                    ),
            },
            resolutions: this.getLikelyIntensions(),
        };
    }

    getLikelyIntensions(): Resolution[] {
        // Construct a set of tokens that weren't parseable so that we can find overlaps between this and possible templates.
        const unparsableTokens = new Set(
            this.unparsable.unparsables.map((t) => t.toWordplay()),
        );

        // Scan through templates of possible expressions in the language, scoring them by number of overlapping tokens.
        return (
            this.context
                .getTemplates()
                // Only consider expressions
                .filter(
                    (template): template is Expression =>
                        template instanceof Expression,
                )
                // Find the size of the overlap between the tokens in the template and the unparseable tokens.
                .map((template) => {
                    const templateTokens = new Set(
                        template.leaves().map((l) => l.toWordplay()),
                    );
                    const intersection = new Set(
                        [...unparsableTokens].filter((x) =>
                            templateTokens.has(x),
                        ),
                    );
                    return [template, intersection.size, intersection] as const;
                })
                // Filter by matches with at least one overlapping token
                .filter(([, count]) => count > 0)
                // Sort in decreasing order of number of overlapping tokens.
                .sort((a, b) => b[1] - a[1])
                // For each possible construct, scan its grammar, attempting to place the unparsable tokens in valid places.
                .map(([template]) => {
                    // Construct a string to eventually parse as an expression.
                    let code = '';
                    let unparsableTokens = this.unparsable.unparsables.slice();
                    const templateTokens = template.nodes(
                        (n): n is Token => n instanceof Token,
                    );

                    const grammar = template.getGrammar();
                    for (let index = 0; index < grammar.length; index++) {
                        const field = grammar[index];
                        // Is this a specifc token that's expected?
                        if (
                            (field.kind instanceof IsA &&
                                typeof field.kind.kind !== 'function') ||
                            (field.kind instanceof Any &&
                                field.kind.kinds.some(
                                    (kind) =>
                                        kind instanceof IsA &&
                                        typeof kind !== 'function',
                                ))
                        ) {
                            // Do any of the unparsable tokens match the required token?
                            const unparsableMatch = unparsableTokens.find((t) =>
                                field.kind.allows(t),
                            );
                            if (unparsableMatch) {
                                // Remove the match we found from the list.
                                unparsableTokens = unparsableTokens.filter(
                                    (t) => t == unparsableMatch,
                                );
                                // Append it's text.
                                code +=
                                    this.context.source
                                        .getSpaces()
                                        .getSpace(unparsableMatch) +
                                    unparsableMatch.getText();
                            }
                            // No unparsable match? Get it from the template's tokens.
                            else if (field.kind.allows(templateTokens[0])) {
                                const match = templateTokens.shift();
                                if (match) code += match.getText();
                            }
                        }
                        // Otherwise, if the field is a list or a specific kind of node, just keep pulling pulling tokens unparsables until we reach something that matches the next
                        // specific token required by the grammar.
                        else {
                            let found = false;
                            do {
                                const next = unparsableTokens.shift();
                                const subsequentMatch = grammar
                                    .slice(index + 1)
                                    .findIndex(
                                        (field) =>
                                            field.kind instanceof IsA &&
                                            field.kind.allows(next),
                                    );
                                if (subsequentMatch >= 0) {
                                    index = subsequentMatch;
                                    break;
                                }
                                if (next) {
                                    found = true;
                                    code +=
                                        this.context.source
                                            .getSpaces()
                                            .getSpace(next) + next.getText();
                                }
                            } while (found && unparsableTokens.length > 0);
                        }
                    }

                    // Attempt to parse the expression we constructed.
                    const tokens = toTokens(code);
                    const expression = parseExpression(tokens);

                    // Did everything parse correctly and there are no tokens left? Return the expression as a candidate.
                    return expression
                        .nodes()
                        .filter((n) => n instanceof UnparsableExpression)
                        .length === 0 && !tokens.hasNext()
                        ? expression
                        : undefined;
                })
                // Filter out the ones that didn't parse as an expression or type.
                .filter((expr): expr is Expression => expr !== undefined)
                // Convert each possible expression into a resolution
                .map((expr) => {
                    return {
                        description: (locales: Locales, context: Context) =>
                            concretize(
                                locales,
                                locales.get(
                                    (l) =>
                                        l.node.UnparsableExpression.conflict
                                            .UnparsableConflict.resolution,
                                ),
                                expr.getLabel(locales),
                                new NodeRef(expr, locales, context),
                            ),
                        mediator: (context: Context) =>
                            context.project.withRevisedNodes([
                                [this.unparsable, expr],
                            ]),
                    };
                })
        );
    }
}
