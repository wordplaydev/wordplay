import type InternalExpression from '@basis/InternalExpression';
import type Locales from '@locale/Locales';
import NodeRef from '@locale/NodeRef';
import ValueRef from '@locale/ValueRef';
import type Expression from '@nodes/Expression';
import type Node from '@nodes/Node';
import PatternAnchor from '@nodes/PatternAnchor';
import PatternWordEdge from '@nodes/PatternWordEdge';
import Check from '@runtime/Check';
import type Evaluator from '@runtime/Evaluator';
import Initialize from '@runtime/Initialize';
import Next from '@runtime/Next';
import {
    graphemesOf,
    searchGenerator,
    testGenerator,
    type MatchSnapshot,
    type PatternMatch,
} from '@runtime/pattern/match';
import type Step from '@runtime/Step';
import MatchValue, { type MatchLoop } from '@values/MatchValue';
import PatternValue from '@values/PatternValue';
import TextValue from '@values/TextValue';

/**
 * Drives the pattern matcher (a generator) one yield per Evaluator step, so a
 * match is single-steppable like the rest of evaluation (LANGUAGE.md; the plan's
 * "observable stepwise" requirement). The match state — the generator plus the
 * latest {@link MatchSnapshot} (current pattern node, position, captures,
 * outcome) — is bound in scope as a {@link MatchValue} so the debugger and the
 * match view can inspect it.
 *
 * The loop steps narrate the live snapshot ("`#` matches “5” at 6", "looking
 * from 1", "matched 1 time — enough") and report the snapshot's source node as
 * their active node, so the editor highlights the construct being tried and the
 * sidebar explains it — the comprehensibility payoff the design is built around.
 *
 * Layout (InternalExpression compiles to [Start, …these…, Finish]):
 *   Initialize → set up the generator and bind state
 *   Check      → advance one yield; when done, jump past Next to Finish
 *   Next       → loop back to Check
 * Finish reads the state's result and builds the value (see TextBasis).
 */

const MatchStateKey = '.match';

export function getMatchLoop(evaluator: Evaluator): MatchLoop | undefined {
    // Only resolvable while a frame that bound it is current.
    if (evaluator.getCurrentEvaluation() === undefined) return undefined;
    const match = evaluator.resolve(MatchStateKey);
    return match instanceof MatchValue ? match.value : undefined;
}

/** The source node the matcher is currently working on, for highlighting. */
function activeMatchNode(evaluator: Evaluator): Node | undefined {
    return getMatchLoop(evaluator)?.snapshot?.node;
}

/**
 * Narrate the latest match beat (LANGUAGE.md observable requirement). The
 * construct being tried renders as a {@link NodeRef} (a real code NodeView, not
 * plain text) and the matched grapheme(s) as a {@link ValueRef} (a quoted text
 * value), so the play-by-play reads like code, not a flat sentence.
 */
function narrateMatch(
    locales: Locales,
    evaluator: Evaluator,
    creator: Expression,
) {
    const snapshot = getMatchLoop(evaluator)?.snapshot;
    if (snapshot === undefined)
        return locales.concretize((l) => l.node.Iteration.check);
    // The pattern construct as a code NodeView (resolve a context from its source
    // so the ref renders against where it actually lives).
    const source = evaluator.project.getSourceOf(snapshot.node);
    const context = source
        ? evaluator.project.getContext(source)
        : evaluator.getCurrentContext();
    const pattern = new NodeRef(snapshot.node, locales, context);
    const position = snapshot.pos + 1; // 1-based for display
    if (snapshot.kind === 'scan')
        return locales.concretize(
            (l) => l.node.PatternLiteral.step.scan,
            { position },
        );
    if (snapshot.kind === 'quantifier')
        return locales.concretize(
            (l) =>
                snapshot.matched
                    ? l.node.PatternLiteral.step.repeat
                    : l.node.PatternLiteral.step.short,
            { pattern, count: snapshot.count ?? 0 },
        );
    // Zero-width atoms (anchors `⊢`/`⊣`, word edges `┊`) test a position, not a
    // grapheme, so they "hold" or don't — never "need a character".
    if (
        snapshot.node instanceof PatternAnchor ||
        snapshot.node instanceof PatternWordEdge
    )
        return locales.concretize(
            (l) =>
                snapshot.matched
                    ? l.node.PatternLiteral.step.here
                    : l.node.PatternLiteral.step.nothere,
            { pattern, position },
        );
    // A grapheme-consuming atom with no grapheme ran off the end of the text.
    if (snapshot.glyph === undefined)
        return locales.concretize(
            (l) => l.node.PatternLiteral.step.end,
            { pattern, position },
        );
    // The matched grapheme(s) as a quoted text value view.
    const glyph = new ValueRef(
        new TextValue(creator, snapshot.glyph),
        locales,
        context,
    );
    return locales.concretize(
        (l) =>
            snapshot.matched
                ? l.node.PatternLiteral.step.match
                : l.node.PatternLiteral.step.miss,
        { pattern, glyph, position },
    );
}

/**
 * The intro step: announce whether we're testing the whole text or searching.
 * It reports the pattern literal as its active node so the editor's step button
 * stops here (the basis node that compiled it isn't in the creator's program).
 */
class MatchInitialize extends Initialize {
    readonly isSearch: boolean;
    constructor(
        node: InternalExpression,
        action: (evaluator: Evaluator) => undefined,
        isSearch: boolean,
    ) {
        super(node, action);
        this.isSearch = isSearch;
    }
    getActiveNode(evaluator: Evaluator) {
        const pattern = evaluator.getCurrentEvaluation()?.getInput(0);
        return pattern instanceof PatternValue ? pattern.pattern : undefined;
    }
    getExplanations(locales: Locales) {
        return locales.concretize((l) =>
            this.isSearch
                ? l.node.PatternLiteral.step.search
                : l.node.PatternLiteral.step.test,
        );
    }
}

/**
 * The advancing step: narrate the live beat and highlight its construct. It is
 * the one stopping point per beat — {@link MatchNext} loops back to it but
 * reports no active node, so the step button lands here exactly once per probe.
 */
class MatchCheck extends Check {
    getActiveNode(evaluator: Evaluator) {
        return activeMatchNode(evaluator);
    }
    getExplanations(locales: Locales, evaluator: Evaluator) {
        return narrateMatch(locales, evaluator, this.node);
    }
}

/**
 * The loop-back step. It reports NO active node so the step button skips it
 * (landing only on {@link MatchCheck}); narration is kept for any path that does
 * pause here (e.g. raw single-stepping).
 */
class MatchNext extends Next {
    getExplanations(locales: Locales, evaluator: Evaluator) {
        return narrateMatch(locales, evaluator, this.node);
    }
}

/** Build the [Initialize, Check, Next] steps that drive a match generator. */
export function matchStepBuilder(isSearch: boolean) {
    return (expr: InternalExpression): Step[] => [
        new MatchInitialize(
            expr,
            (evaluator: Evaluator) => {
                evaluator.getCurrentEvaluation()?.scope();
                const evaluation = evaluator.getCurrentEvaluation();
                const text = evaluation?.getClosure();
                const pattern = evaluation?.getInput(0);
                const t = text instanceof TextValue ? text.text : '';
                const p =
                    pattern instanceof PatternValue
                        ? pattern.pattern
                        : undefined;
                const gen: MatchLoop['gen'] =
                    p === undefined
                        ? (function* () {
                              return isSearch ? [] : false;
                          })()
                        : isSearch
                          ? searchGenerator(p, t)
                          : testGenerator(p, t);
                evaluator.bind(
                    MatchStateKey,
                    new MatchValue(expr, {
                        gen,
                        graphemes: graphemesOf(t),
                        snapshot: undefined,
                        result: undefined,
                        done: false,
                    }),
                );
                return undefined;
            },
            isSearch,
        ),
        new MatchCheck(expr, (evaluator: Evaluator) => {
            const state = getMatchLoop(evaluator);
            if (state === undefined) return undefined;
            const { value, done } = state.gen.next();
            if (done) {
                state.result = value as boolean | PatternMatch[];
                state.done = true;
                evaluator.jump(1); // skip Next, fall through to Finish
            } else state.snapshot = value as MatchSnapshot;
            return undefined;
        }),
        new MatchNext(expr, (evaluator: Evaluator) => {
            evaluator.jump(-2); // loop back to Check
            return undefined;
        }),
    ];
}
