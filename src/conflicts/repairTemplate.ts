import Expression from '@nodes/Expression';
import parseExpression from '@parser/parseExpression';
import parseBind from '@parser/parseBind';
import { toTokens } from '@parser/toTokens';
import UnparsableExpression from '@nodes/UnparsableExpression';
import UnparsableType from '@nodes/UnparsableType';
import { Sym, type SymType } from '@nodes/Sym';
import Token from '@nodes/Token';
import { LiteralMultiCharTokens } from '@parser/Tokenizer';
import type RepairContext from '@conflicts/RepairContext';
import {
    MisconceptionSubstitutions,
    collectAnchors,
} from '@conflicts/AnchorSymbols';
import Reference from '@nodes/Reference';
import Bind from '@nodes/Bind';
import levenshtein from '@util/levenshtein';
import type Node from '@nodes/Node';

/** A candidate repair: parsed AST, where it came from, and its cost ranking. */
export type RepairCandidate = {
    /** The parsed expression or bind that replaces the {@link replaceTarget}. */
    expression: Expression | Bind;
    /**
     * The AST node the repair swaps in for. Often the UnparsableExpression
     * itself, but when the inference used surrounding context — a parent
     * whose anchor token leaked into the diagnosis, or a merge that resolved
     * a multi-glyph token across the parent's text — the right replacement
     * scope is that ancestor, not the inner broken fragment.
     */
    replaceTarget: Node;
    /** Source code that produced the expression (for debugging / tie-breaks). */
    code: string;
    /** Lower is better; 0 means the user's tokens reparsed cleanly with no scaffolding. */
    cost: number;
    /** True if any `_` placeholders were injected — these rank below clean repairs. */
    scaffolded: boolean;
    /** Which anchor symbol drove this candidate, if any. */
    anchor: SymType | undefined;
};

/**
 * Skeleton patterns keyed by anchor symbol. Each emits a candidate code string;
 * `_` is the Wordplay placeholder, so the resulting parse contains `ExpressionPlaceholder`
 * nodes — legitimate scaffolding, not failure.
 */
type Skeleton = {
    anchor: SymType;
    scaffold: string;
};

const Skeletons: readonly Skeleton[] = [
    // Definition-shaped — parse as the full definition with a placeholder body.
    { anchor: Sym.Type, scaffold: '• _() (_)' },
    { anchor: Sym.Function, scaffold: 'ƒ _() _' },
    // Control flow — `?` and `→` only land here when not already an out-of-order repair.
    { anchor: Sym.Conditional, scaffold: '_ ? _ _' },
    { anchor: Sym.Convert, scaffold: '_ → _' },
    // Bind: parsed via parseBind fallback in tryParse, not parseExpression.
    { anchor: Sym.Bind, scaffold: '_: _' },
    // Combinators.
    { anchor: Sym.Otherwise, scaffold: '_ ?? _' },
    // Match needs an odd number of slots after `???`: pairs of (condition `:` result)
    // followed by a single default. `_ ??? _: _ _` is one case + default and parses
    // cleanly; an extra `_: _` pair would leave the parser expecting another value.
    { anchor: Sym.Match, scaffold: '_ ??? _: _ _' },
    // Stream-related — verified to parse cleanly via parseExpression.
    { anchor: Sym.Stream, scaffold: '_ … _ … _' },
    { anchor: Sym.Change, scaffold: '∆ _' },
    { anchor: Sym.Previous, scaffold: '← _ _' },
    { anchor: Sym.Initial, scaffold: '◆' },
    { anchor: Sym.Formatted, scaffold: '`_`' },
];

/**
 * Generate candidate repairs from anchor symbols present in the broken fragment
 * and its adjacent line tokens. Each candidate is parsed eagerly so we can drop
 * any that fail to fully consume the token stream.
 */
export function generateAnchorCandidates(
    rc: RepairContext,
): RepairCandidate[] {
    const candidates: RepairCandidate[] = [];

    const userText = rc.unparsableTokens
        .map((t) => t.getText())
        .join(' ')
        .trim();

    const anchors = collectAnchors(rc.unparsableTokens, [
        ...rc.precedingLineTokens,
        ...rc.followingLineTokens,
    ]);

    // Also infer anchors from multi-glyph merge patterns visible in the
    // surrounding source text — e.g. `? ? ?` implies a Match scaffold even
    // when its merged form `a???` can't reach a clean parse.
    const immediateParent = rc.ancestors[0];
    if (immediateParent !== undefined) {
        const surroundingText = reconstructText(
            immediateParent,
            rc.context.source,
        );
        for (const sym of collectMergeAnchors(surroundingText)) {
            anchors.add(sym);
        }
    }

    // 1. Textual misconception substitution on the unparsable's own text.
    const substituted = applyMisconceptionSubstitutions(userText);
    if (substituted !== undefined && substituted !== userText) {
        const node = tryParse(substituted);
        if (node !== undefined) {
            candidates.push({
                expression: node,
                replaceTarget: rc.unparsable,
                code: substituted,
                cost: 1,
                scaffolded: false,
                anchor: undefined,
            });
        }
    }

    // 2. Anchor-driven skeleton candidates. When the candidate's node class
    //    matches the immediate parent's class (e.g. a Previous repair under
    //    a malformed Previous, or a FunctionDefinition repair under `(ƒ ?`),
    //    swap the *parent* instead of just the inner unparsable — the parent
    //    is what the user was building, and replacing it produces a single
    //    coherent suggestion instead of nesting a fresh skeleton inside a
    //    broken outer shell.
    for (const skel of Skeletons) {
        if (!anchors.has(skel.anchor)) continue;
        const node = tryParse(skel.scaffold);
        if (node === undefined) continue;
        const placeholderCount = (skel.scaffold.match(/_/g) ?? []).length;
        const replaceTarget =
            immediateParent !== undefined &&
            node.constructor === immediateParent.constructor
                ? immediateParent
                : rc.unparsable;
        candidates.push({
            expression: node,
            replaceTarget,
            code: skel.scaffold,
            cost: placeholderCount,
            scaffolded: true,
            anchor: skel.anchor,
        });
    }

    // 3. In-scope name fuzz: if the unparsable contains a Name-like token whose
    //    Levenshtein distance to an in-scope definition's name is ≤ 1, propose a
    //    Reference to that name as a candidate.
    for (const tok of rc.unparsableTokens) {
        if (!tok.isSymbol(Sym.Name)) continue;
        const userName = tok.getText();
        for (const def of rc.scope) {
            for (const defName of def.names.getNames()) {
                if (defName.length === 0) continue;
                if (defName === userName) continue;
                if (levenshtein(userName, defName) <= 1) {
                    const ref = Reference.make(defName);
                    candidates.push({
                        expression: ref,
                        replaceTarget: rc.unparsable,
                        code: defName,
                        cost: 0,
                        scaffolded: false,
                        anchor: undefined,
                    });
                }
            }
        }
    }

    return candidates;
}

/**
 * Multi-glyph token merges to try on the user's source text. Each pattern
 * collapses an accidentally-space-separated multi-character token into the
 * single token the user almost certainly intended, and carries the SymType
 * that token represents — so even when the merge can't form a clean parse
 * (e.g. Match without a default case), we still know which scaffold to
 * suggest. Patterns are tried in order; longer merges win when overlapping.
 *
 * Patterns are derived from {@link LiteralMultiCharTokens} — the tokenizer's
 * own ground truth on which literal strings tokenize as a single token. For
 * each entry we generate every way to interleave whitespace between its
 * characters: `???` produces `? ? ?` / `?? ?` / `? ??`; `??` produces `? ?`;
 * `⎡?` produces `⎡ ?`; and so on. Adding a new multi-character literal token
 * to the tokenizer picks up merge support for free.
 */
type MergePattern = { from: RegExp; to: string; anchor: SymType };

function escapeForRegex(ch: string): string {
    return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * For a multi-char literal token value, generate every way to interleave
 * `\s+` between its characters. Returns the regex source strings.
 *
 * Example: `'???'` (3 chars, 2 gaps) → `['?\\s+??', '??\\s+?', '?\\s+?\\s+?']`,
 * giving merge regexes for `? ??`, `?? ?`, and `? ? ?` respectively.
 */
function splitSources(value: string): string[] {
    const chars = Array.from(value).map(escapeForRegex);
    if (chars.length < 2) return [];
    const gaps = chars.length - 1;
    const sources: string[] = [];
    for (let mask = 1; mask < 1 << gaps; mask++) {
        let pattern = chars[0];
        for (let i = 0; i < gaps; i++) {
            pattern += mask & (1 << i) ? '\\s+' : '';
            pattern += chars[i + 1];
        }
        sources.push(pattern);
    }
    return sources;
}

function deriveMergePatterns(): MergePattern[] {
    const patterns: MergePattern[] = [];
    for (const { text, sym } of LiteralMultiCharTokens) {
        for (const source of splitSources(text)) {
            patterns.push({
                from: new RegExp(source, 'g'),
                to: text,
                anchor: sym,
            });
        }
    }
    // Sort by descending target length so longer merges (e.g. `???`) get tried
    // before their shorter prefixes (`??`) and win on overlap.
    patterns.sort((a, b) => b.to.length - a.to.length);
    return patterns;
}

const MergePatterns: ReadonlyArray<MergePattern> = deriveMergePatterns();

/**
 * Scan reconstructed source text for merge patterns and report the SymType
 * each match implies. Lets the anchor-driven layer offer Otherwise / Match /
 * Convert skeleton suggestions even when the actual merged reparse fails
 * (e.g. `a ? ? ?` → merged `a???` requires a Match default the user didn't
 * type, so a complete repair isn't reachable — but the *intent* is still
 * Match, and a scaffolded Match suggestion is the right fallback).
 */
function collectMergeAnchors(text: string): Set<SymType> {
    const anchors = new Set<SymType>();
    for (const { from, anchor } of MergePatterns) {
        // Fresh regex per probe — `g` flag carries state across .test calls.
        if (new RegExp(from.source).test(text)) anchors.add(anchor);
    }
    return anchors;
}

/**
 * Try to repair the unparsable by reconstructing each ancestor's source text
 * and applying multi-glyph merge substitutions. Common case: the user wrote
 * `? ?` intending `??`, `? ??` intending `???`, or `- >` intending `→` — the
 * space made the tokenizer see two separate symbols. Collapsing the space gives
 * the parser a chance at the multi-glyph token the user meant.
 *
 * Each candidate's `replaceTarget` is the ancestor whose source text was
 * substituted — so the resulting suggestion swaps the whole broken construct in
 * one go, not a sub-fragment inside an outer shell.
 */
export function generateMergeCandidates(
    rc: RepairContext,
): RepairCandidate[] {
    const candidates: RepairCandidate[] = [];
    const source = rc.context.source;

    // Walk up to three ancestors; stop at structural roots where replacement
    // via withRevisedNodes isn't meaningful.
    const ancestors = rc.ancestors.slice(0, 3);
    for (const target of ancestors) {
        const className = target.constructor.name;
        if (className === 'Source' || className === 'Program') break;

        const originalText = reconstructText(target, source);
        if (originalText.length === 0) continue;

        for (const { from, to } of MergePatterns) {
            const merged = originalText.replace(from, to);
            if (merged === originalText) continue;
            const parsed = tryParse(merged);
            if (parsed === undefined) continue;
            if (parsed.isEqualTo(target)) continue;

            candidates.push({
                expression: parsed,
                replaceTarget: target,
                code: merged,
                cost: 0,
                scaffolded: false,
                anchor: undefined,
            });
        }
    }
    return candidates;
}

/**
 * Reconstruct the original source text of a node, preserving the user's actual
 * whitespace between its tokens. Unlike `Node.toWordplay()`, which strips most
 * inter-token spaces and would silently fuse adjacent name/number tokens, this
 * keeps the source faithful so regex-based merges can selectively collapse
 * just the patterns we know about.
 */
function reconstructText(
    target: Node,
    source: RepairContext['context']['source'],
): string {
    const tokens = target.nodes((n): n is Token => n instanceof Token);
    if (tokens.length === 0) return '';
    const spaces = source.spaces;
    return tokens
        .map((t, i) => (i === 0 ? '' : spaces.getSpace(t)) + t.getText())
        .join('');
}

/**
 * Filter and rank candidates against the repair context, then return the best 3.
 * Order: complete (non-scaffolded) before scaffolded; within each, ascending cost.
 */
export function selectBestCandidates(
    rc: RepairContext,
    candidates: RepairCandidate[],
): RepairCandidate[] {
    const filtered: RepairCandidate[] = [];
    const seen = new Set<string>();
    for (const c of candidates) {
        // De-duplicate: same code + same target = same suggestion. Different
        // targets are kept separate even when the produced expression matches.
        const key = `${c.replaceTarget.id} ${c.expression.toWordplay()}`;
        if (seen.has(key)) continue;
        seen.add(key);

        // Drop candidates whose replacement doesn't fit the target's slot.
        if (!fitsTargetSlot(c, rc)) continue;

        // Drop candidates that are structurally identical to what they replace.
        if (c.expression.isEqualTo(c.replaceTarget)) continue;

        filtered.push(c);
    }

    filtered.sort((a, b) => {
        if (a.scaffolded !== b.scaffolded) return a.scaffolded ? 1 : -1;
        return a.cost - b.cost;
    });

    return filtered.slice(0, 3);
}

/**
 * Does the candidate's expression fit the slot its replaceTarget currently
 * occupies? When the target is the unparsable, this matches the old behavior;
 * when the target is an ancestor, we check that ancestor's grandparent slot
 * instead so swapping doesn't break the tree.
 */
function fitsTargetSlot(c: RepairCandidate, rc: RepairContext): boolean {
    const root = rc.context.source.root;
    const field = root.getFieldOfChild(c.replaceTarget);
    if (field === undefined) {
        // No parent — only Source itself sits at the top level, and we never
        // replace it. If we reach this for any other node, accept.
        return true;
    }
    if (field.kind.allowsKind(c.expression.constructor as Function))
        return true;
    // Bind isn't always allowed where Expression is — special-case the
    // common Block-statement slot that accepts both.
    if (c.expression instanceof Bind && field.kind.allowsKind(Bind))
        return true;
    if (c.expression instanceof Expression && field.kind.allowsKind(Expression))
        return true;
    return false;
}

function tryParse(code: string): Expression | Bind | undefined {
    // Try parseExpression first; fall back to parseBind for inputs like `x: 5`
    // that are only meaningful as bindings.
    const asExpr = tryParseWith(code, parseExpression);
    if (asExpr !== undefined) return asExpr;
    return tryParseWith(code, parseBind);
}

function tryParseWith<T extends Node>(
    code: string,
    parser: (tokens: ReturnType<typeof toTokens>) => T,
): T | undefined {
    try {
        const tokens = toTokens(code);
        const result = parser(tokens);
        if (tokens.hasNext()) return undefined;
        for (const child of result.nodes()) {
            if (child instanceof UnparsableExpression) return undefined;
            if (child instanceof UnparsableType) return undefined;
        }
        return result;
    } catch {
        return undefined;
    }
}

function applyMisconceptionSubstitutions(text: string): string | undefined {
    if (text.length === 0) return undefined;
    // Token-level substitutions: replace whole-word matches only.
    let result = text;
    let changed = false;
    for (const [from, sym] of MisconceptionSubstitutions) {
        const canonical = symToText(sym);
        if (canonical === undefined) continue;
        // Use word boundaries for word-like substitutions; literal escape for symbols.
        const pattern = /^[a-zA-Z]+$/.test(from)
            ? new RegExp(`\\b${escapeRegExp(from)}\\b`, 'g')
            : new RegExp(escapeRegExp(from), 'g');
        if (pattern.test(result)) {
            result = result.replace(pattern, canonical);
            changed = true;
        }
    }
    return changed ? result : undefined;
}

function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function symToText(sym: SymType): string | undefined {
    // The Sym values for fixed-text symbols are the canonical character(s).
    // Wildcards like Sym.Name aren't reverse-mappable; return undefined for those.
    // This relies on the fact that DistinctiveSymbols + Sym.Bind / Sym.Convert
    // are all fixed-text. Misconception targets are restricted to those.
    const fixed: SymType[] = [
        Sym.Bind,
        Sym.Convert,
        Sym.Function,
        Sym.Type,
        Sym.Conditional,
    ];
    return fixed.includes(sym) ? sym : undefined;
}

