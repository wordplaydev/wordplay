import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import Expression from '@nodes/Expression';
import type Node from '@nodes/Node';
import { Any, IsA } from '@nodes/Node';
import Token from '@nodes/Token';
import UnparsableExpression from '@nodes/UnparsableExpression';
import type UnparsableType from '@nodes/UnparsableType';
import parseExpression from '@parser/parseExpression';
import { toTokens } from '@parser/toTokens';
import type Locales from '@locale/Locales';
import Conflict, {
    type Repair,
    type Resolution,
    type Resolutions,
} from '@conflicts/Conflict';
import Bind from '@nodes/Bind';
import RepairContext from '@conflicts/RepairContext';
import {
    generateAnchorCandidates,
    generateMergeCandidates,
    selectBestCandidates,
    type RepairCandidate,
} from '@conflicts/repairTemplate';

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

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.UnparsableExpression.conflict.UnparsableConflict.conflict;

    getMessage() {
        return {
            node: this.unparsable,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => UnparsableConflict.LocalePath(l).explanation,
                    {
                        expression:
                            this.unparsable instanceof UnparsableExpression,
                    },
                ),
        };
    }

    override getResolutions(_context: Context, nodes: Node[]): Resolutions {
        const repairs = this.getLikelyIntentions(nodes);
        // Fall back to the synthesised explainer when inference produces zero
        // candidates — preserves the non-empty Resolutions invariant.
        return repairs.length === 0
            ? Conflict.fallbackExplainer(this, _context, nodes)
            : (repairs as readonly Resolution[] as Resolutions);
    }

    getLocalePath() {
        return UnparsableConflict.LocalePath;
    }

    /**
     * Suggest possible programmer intents for this unparsable fragment.
     *
     * Approach (see plans/can-you-expore-885-replicated-acorn.md):
     *  1. Build a RepairContext: parent slot, expected type, ancestors,
     *     adjacent line tokens, in-scope names.
     *  2. Generate candidate repairs from anchor symbols (•, ƒ, ?, →, …),
     *     misconception substitutions (fn→ƒ, ->→→), and in-scope name fuzz.
     *  3. Run the legacy out-of-order grammar walker against the template list
     *     so existing behavior — repairs that just need token reordering — is
     *     preserved.
     *  4. Filter for parent-slot fit, dedupe, and rank: complete repairs above
     *     scaffolded ones; within each tier, ascending repair cost. Top 3.
     */
    getLikelyIntentions(templates: Node[]): Repair[] {
        const rc = RepairContext.gather(this.unparsable, this.context);

        const anchorCandidates = generateAnchorCandidates(rc);
        const mergeCandidates = generateMergeCandidates(rc);
        const legacyCandidates = this.legacyTemplateCandidates(templates, rc);

        const best = selectBestCandidates(rc, [
            ...mergeCandidates,
            ...legacyCandidates,
            ...anchorCandidates,
        ]);

        return best.map((c) => this.toResolution(c.expression, c.replaceTarget));
    }

    /**
     * The previous template-overlap grammar walker, kept as a layer because it
     * handles the out-of-order-token cases that aren't reached by the anchor
     * skeletons. Returns parsed expressions wrapped as RepairCandidate so they
     * compete in the same ranking pass. These candidates always replace the
     * unparsable itself (not an ancestor) since they're built from its tokens.
     */
    private legacyTemplateCandidates(
        templates: Node[],
        rc: RepairContext,
    ): RepairCandidate[] {
        const unparsableTokenTexts = new Set(
            this.unparsable.unparsables.map((t) => t.toWordplay()),
        );

        const scored = templates
            .filter(
                (template): template is Expression =>
                    template instanceof Expression,
            )
            .map((template) => {
                const templateTokens = new Set(
                    template.leaves().map((l) => l.toWordplay()),
                );
                const overlap = new Set(
                    [...unparsableTokenTexts].filter((x) =>
                        templateTokens.has(x),
                    ),
                );
                return [template, overlap.size] as const;
            })
            .filter(([, count]) => count > 0)
            .sort((a, b) => b[1] - a[1]);

        const candidates: RepairCandidate[] = [];
        for (const [template, overlap] of scored) {
            const reconstructed = this.reconstructFromTemplate(template);
            if (reconstructed === undefined) continue;
            candidates.push({
                expression: reconstructed,
                replaceTarget: rc.unparsable,
                code: reconstructed.toWordplay(),
                // Templates with more overlap rank slightly better. Subtract a
                // small bonus from cost so a 5-token overlap beats a 1-token
                // overlap when both produce a clean repair.
                cost: Math.max(0, 5 - overlap),
                scaffolded: false,
                anchor: undefined,
            });
        }
        return candidates;
    }

    private reconstructFromTemplate(template: Expression): Expression | undefined {
        let code = '';
        let unparsableTokens = this.unparsable.unparsables.slice();
        const templateTokens = template.nodes(
            (n): n is Token => n instanceof Token,
        );

        const grammar = template.getGrammar();
        for (let index = 0; index < grammar.length; index++) {
            const field = grammar[index];
            const isSpecificToken =
                (field.kind instanceof IsA &&
                    typeof field.kind.kind !== 'function') ||
                (field.kind instanceof Any &&
                    field.kind.kinds.some(
                        (kind) =>
                            kind instanceof IsA &&
                            typeof kind !== 'function',
                    ));
            if (isSpecificToken) {
                const unparsableMatch = unparsableTokens.find((t) =>
                    field.kind.allows(t),
                );
                if (unparsableMatch) {
                    unparsableTokens = unparsableTokens.filter(
                        (t) => t === unparsableMatch,
                    );
                    code +=
                        this.context.source
                            .getSpaces()
                            .getSpace(unparsableMatch) +
                        unparsableMatch.getText();
                } else if (field.kind.allows(templateTokens[0])) {
                    const match = templateTokens.shift();
                    if (match) code += match.getText();
                }
            } else {
                let found = false;
                do {
                    const next = unparsableTokens.shift();
                    const subsequentMatch = grammar
                        .slice(index + 1)
                        .findIndex(
                            (f) => f.kind instanceof IsA && f.kind.allows(next),
                        );
                    if (subsequentMatch >= 0) {
                        index = subsequentMatch;
                        break;
                    }
                    if (next) {
                        found = true;
                        code +=
                            this.context.source.getSpaces().getSpace(next) +
                            next.getText();
                    }
                } while (found && unparsableTokens.length > 0);
            }
        }

        const tokens = toTokens(code);
        const expression = parseExpression(tokens);
        const clean =
            expression
                .nodes()
                .filter((n) => n instanceof UnparsableExpression).length === 0 &&
            !tokens.hasNext();
        return clean ? expression : undefined;
    }

    private toResolution(repair: Expression | Bind, target: Node): Repair {
        return {
            kind: 'repair',
            description: (locales: Locales, context: Context) =>
                locales.concretize(
                    (l) =>
                        l.node.UnparsableExpression.conflict.UnparsableConflict
                            .resolution,
                    {
                        first: repair.getLabel(locales),
                        second: new NodeRef(repair, locales, context),
                    },
                ),
            mediator: (context: Context) => {
                return {
                    newProject: context.project.withRevisedNodes([
                        [target, repair],
                    ]),
                    newNode: repair,
                };
            },
        };
    }
}
