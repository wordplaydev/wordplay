import type Node from '@nodes/Node';
import type Source from '@nodes/Source';
import Token from '@nodes/Token';
import type Spaces from '@parser/Spaces';
import { alignAffixed, type Alignment } from '@util/align';
import { must } from '@util/nullable';
import fingerprint from '@edit/diff/fingerprint';

/**
 * A structural diff between a checkpoint's code and the project's current code,
 * for rendering in the editor while an older version is being viewed (#633).
 *
 * The whole result is expressed in *before-tree* terms, because the before tree
 * is what the editor renders: a view walking it answers both questions with one
 * lookup per token, and never holds a node from the other tree except as
 * something to draw. That matters — node ids are a global counter, so an
 * after-tree node rendered through the ordinary node views would emit a
 * `data-id` that collides with the live source mounted in another tile.
 */

/**
 * What is true of one token of the version being viewed.
 *
 * Deliberately says only *where* code is, never what that means for the reader.
 * The meaning depends on the task, and the task here is deciding whether to
 * restore: code only in this version comes back, code only in the current one
 * goes away. A second surface that merely browses history would want the
 * opposite labels from the same facts, so the labels live in the views.
 */
export type TokenDiff = {
    /** This token is in the version being viewed and not in the current one. */
    onlyHere: boolean;
    /**
     * Current-version code absent from this version, drawn just before this
     * token — an insertion, which belongs at the point that code sits.
     *
     * Undefined rather than an empty list so a view's check is one falsy test.
     */
    onlyNowBefore: Node[] | undefined;
    /**
     * Current-version code absent from this version, drawn just after this
     * token — a replacement, which belongs beside what it replaced.
     *
     * Two buckets rather than one because the anchor that reads correctly
     * differs by case. A replacement anchored on the token that *follows* the
     * marked code lands past the line break whenever that code ends a line,
     * which separates the two both on screen and in the caret announcement.
     */
    onlyNowAfter: Node[] | undefined;
};

export type SourceDiff = {
    /**
     * One entry per token of this version that differs from the current one — a
     * single map so a view pays one `Map.get` per token rather than two.
     */
    tokens: Map<Token, TokenDiff>;
    /**
     * Gained code that follows every before token. Empty whenever the before
     * program has its `end` token, which every parsed source does; present so
     * the model is total.
     */
    trailing: Node[];
    /**
     * The current version's spacing. The only place that code's own spacing
     * exists — the before source's `Spaces` map knows nothing of those tokens.
     */
    afterSpaces: Spaces;
    /** How many tokens are only in this version, for the summary and the announcement. */
    onlyHereTokens: number;
    /** How many are only in the current version, likewise. */
    onlyNowTokens: number;
};

/**
 * The most cells an alignment table may take for one field. `alignAffixed`
 * strips the matching prefix and suffix first, so a realistic edit never
 * approaches this; it is here so that two genuinely unrelated thousand-element
 * lists degrade to "wholly unalike" instead of allocating a million-cell
 * table. 400 x 400.
 */
const MaxAlignmentCells = 160000;

/** One step of the diff, in diff words rather than `align`'s merge words. */
type DiffStep =
    | { kind: 'both'; before: Node; after: Node }
    | { kind: 'onlyHere'; before: Node }
    | { kind: 'onlyNow'; after: Node };

/** Accumulates the marks as the two trees are walked. */
class DiffBuilder {
    readonly tokens = new Map<Token, TokenDiff>();
    readonly trailing: Node[] = [];
    onlyHereTokens = 0;
    onlyNowTokens = 0;

    private entry(token: Token): TokenDiff {
        const existing = this.tokens.get(token);
        if (existing !== undefined) return existing;
        const created: TokenDiff = {
            onlyHere: false,
            onlyNowBefore: undefined,
            onlyNowAfter: undefined,
        };
        this.tokens.set(token, created);
        return created;
    }

    /** Mark every token of a subtree the current version doesn't have. */
    markOnlyHere(node: Node) {
        for (const leaf of node.leaves()) {
            const entry = this.entry(leaf);
            if (!entry.onlyHere) {
                entry.onlyHere = true;
                this.onlyHereTokens++;
            }
        }
    }

    /**
     * Place current-version code before `anchor`, or at the very end when there
     * is no anchor. Prepends, because the walk runs right to left and this is
     * what keeps them in document order.
     */
    onlyNowBefore(anchor: Token | undefined, node: Node) {
        this.onlyNowTokens += node.leaves().length;
        if (anchor === undefined) {
            this.trailing.unshift(node);
            return;
        }
        const entry = this.entry(anchor);
        entry.onlyNowBefore =
            entry.onlyNowBefore === undefined
                ? [node]
                : [node, ...entry.onlyNowBefore];
    }

    /** Place current-version code immediately after `anchor`. */
    onlyNowAfter(anchor: Token, node: Node) {
        this.onlyNowTokens += node.leaves().length;
        const entry = this.entry(anchor);
        entry.onlyNowAfter =
            entry.onlyNowAfter === undefined
                ? [node]
                : [node, ...entry.onlyNowAfter];
    }
}

/**
 * `align`'s vocabulary is the tutorial merge's, where `source` is the authority
 * and `target` the copy: `insert` means "in source only", `remove` means "in
 * target only". Passing before as source and after as target, those read as
 * "only here" and "only now" — but only once renamed, which is what this does.
 *
 * It also pairs a run of changes positionally, so that renaming one name inside
 * a large expression marks that one token rather than striking the whole
 * expression and marking its replacement whole.
 */
function toSteps(steps: Alignment<Node>[]): DiffStep[] {
    const result: DiffStep[] = [];
    let index = 0;
    while (index < steps.length) {
        const step = must(steps[index], 'an alignment step');
        if (step.kind === 'keep') {
            result.push({
                kind: 'both',
                before: step.source,
                after: step.target,
            });
            index++;
            continue;
        }

        // Gather the whole run of changes between two kept nodes.
        const onlyHere: Node[] = [];
        const onlyNow: Node[] = [];
        while (index < steps.length) {
            const next = steps[index];
            if (next === undefined || next.kind === 'keep') break;
            if (next.kind === 'insert') onlyHere.push(next.source);
            else onlyNow.push(next.target);
            index++;
        }

        // Pair them off while they describe the same kind of thing. Pairing
        // stops at the first mismatch rather than searching, because a run is
        // almost always one for one and a wrong pairing reads worse than none.
        let paired = 0;
        const pairable = Math.min(onlyHere.length, onlyNow.length);
        while (paired < pairable) {
            const before = must(onlyHere[paired], 'a node only here');
            const after = must(onlyNow[paired], 'a node only now');
            if (before.getDescriptor() !== after.getDescriptor()) break;
            result.push({ kind: 'both', before, after });
            paired++;
        }

        // This version's own code first, then the current version's, so the
        // two readings of one place sit in that order wherever both appear.
        for (let i = paired; i < onlyHere.length; i++)
            result.push({
                kind: 'onlyHere',
                before: must(onlyHere[i], 'a node only here'),
            });
        for (let i = paired; i < onlyNow.length; i++)
            result.push({
                kind: 'onlyNow',
                after: must(onlyNow[i], 'a node only now'),
            });
    }
    return result;
}

/**
 * Diff two nodes, given the first before-tree token that follows them — the
 * anchor current-version code here is drawn in front of.
 */
function diffPair(
    before: Node,
    after: Node,
    successor: Token | undefined,
    out: DiffBuilder,
): void {
    // The same subtree. This early-out is what makes the diff linear in what
    // actually changed rather than in the size of the file.
    if (fingerprint(before) === fingerprint(after)) return;

    // A token has no children to recurse into, and two nodes of different kinds
    // have no fields in common, so either way it is whole for whole. Tokens
    // need saying explicitly: every token's descriptor is `Token`, so the
    // descriptor test alone would call two different tokens comparable and then
    // find no children to blame the difference on.
    if (
        before instanceof Token ||
        after instanceof Token ||
        before.getDescriptor() !== after.getDescriptor()
    ) {
        out.markOnlyHere(before);
        // Drawn immediately after this version's own last token, so the two
        // readings of one place sit together, and so the caret landing on the
        // marked code can say what stands there now. The successor is only the
        // fallback, for a node with no tokens of its own to hang from.
        const last = before.getLastLeaf();
        if (last instanceof Token) out.onlyNowAfter(last, after);
        else out.onlyNowBefore(successor, after);
        return;
    }

    // Same kind of node, so the same grammar, so the same fields in the same
    // order. Walk them backwards, carrying the successor: by the time a
    // current-version node is reached, the token it belongs in front of is
    // already known, which
    // is what makes this one pass rather than two.
    const grammar = before.getGrammar();
    let successorOfField = successor;
    for (let index = grammar.length - 1; index >= 0; index--) {
        const name = must(grammar[index], 'a grammar field').name;
        successorOfField = diffField(
            before.getField(name),
            after.getField(name),
            successorOfField,
            out,
        );
    }
}

/**
 * Diff one grammar field, returning the first before-tree token in it — the
 * successor for the field to its left. A single-node field is treated as a
 * one-element list, which costs nothing and means there is one code path.
 */
function diffField(
    before: Node | Node[] | undefined,
    after: Node | Node[] | undefined,
    successor: Token | undefined,
    out: DiffBuilder,
): Token | undefined {
    const beforeNodes = asNodes(before);
    const afterNodes = asNodes(after);
    if (beforeNodes.length === 0 && afterNodes.length === 0) return successor;

    const steps = toSteps(
        alignAffixed(beforeNodes, afterNodes, fingerprint, MaxAlignmentCells),
    );

    let anchor = successor;
    for (let index = steps.length - 1; index >= 0; index--) {
        const step = must(steps[index], 'a diff step');
        if (step.kind === 'onlyNow') {
            out.onlyNowBefore(anchor, step.after);
            continue;
        }
        if (step.kind === 'both')
            diffPair(step.before, step.after, anchor, out);
        else out.markOnlyHere(step.before);
        anchor = step.before.getFirstLeaf() ?? anchor;
    }
    return anchor;
}

function asNodes(field: Node | Node[] | undefined): Node[] {
    if (field === undefined) return [];
    return Array.isArray(field) ? field : [field];
}

/**
 * What the current version changed about a checkpoint's code.
 *
 * Only the program is compared: a `Source`'s grammar declares `expression`
 * alone, so its names are never rendered in the editor and have nothing to
 * mark.
 */
export default function diffSources(before: Source, after: Source): SourceDiff {
    const out = new DiffBuilder();
    diffPair(before.expression, after.expression, undefined, out);
    return {
        tokens: out.tokens,
        trailing: out.trailing,
        afterSpaces: after.spaces,
        onlyHereTokens: out.onlyHereTokens,
        onlyNowTokens: out.onlyNowTokens,
    };
}
