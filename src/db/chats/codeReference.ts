import type { SerializedCodeReference } from '@db/chats/ChatDatabase.svelte';
import type Project from '@db/projects/Project';
import type Caret from '@edit/caret/Caret';
import type Locales from '@locale/Locales';
import Block from '@nodes/Block';
import Node from '@nodes/Node';
import Program from '@nodes/Program';
import Source from '@nodes/Source';
import Token from '@nodes/Token';

/**
 * What a message's code reference points at right now (#820).
 *
 * `valid` means the code is still there and can be shown; `invalid` means it has
 * changed enough that pointing at anything would be a guess.
 *
 * These are resolved **once per project view** and published through
 * `getResolvedReferences` in Contexts, rather than resolved where they are
 * shown. Two readers want the same answer — the gutter needs to know which
 * nodes carry a marker, the chip beside each message needs to say which line —
 * and resolving is not free: a path that no longer lands on its own code falls
 * back to the scan in `uniqueNodeWithCode` below. Resolving in both places was
 * paying for that twice on every keystroke.
 *
 * The three companion slots there are similarly split by who holds what: the
 * chat has the messages, the editors have the code, and only the project view
 * has both. Contexts keeps its own notes deliberately short, since it is
 * reachable from every page and `importGraph.test.ts` counts its bytes.
 */
export type ResolvedReference =
    | {
          state: 'valid';
          source: Source;
          node: Node;
          /** 1-based, the way the editor numbers its lines. */
          firstLine: number;
          lastLine: number;
      }
    | { state: 'invalid' };

/**
 * Find the code a reference names, if it is still there.
 *
 * A {@link Path} alone is not enough, and the reason is the point of this
 * function. A path is a sequence of parent descriptors and *child indices*, so
 * inserting a statement above the referenced one shifts every later index and
 * the path resolves to a *different* node rather than to nothing — a reference
 * that quietly moves to someone else's code is worse than one that admits it is
 * lost. So the code the reference was made against is the check: the path is
 * only believed when what it lands on still reads the same.
 *
 * When it doesn't, the same code somewhere else in the file is good evidence
 * the node moved rather than went — but only when there is exactly one
 * candidate. Two identical lines give no way to choose, and picking either is
 * the silent-repointing failure again, so that is invalid too.
 */
export function resolveReference(
    project: Project,
    reference: SerializedCodeReference,
): ResolvedReference {
    const source = project.getSources()[reference.source];
    if (source === undefined) return { state: 'invalid' };

    // Compared without whitespace, which is what `toWordplay()` gives a node on
    // its own: a reference should survive the file being reformatted around it,
    // and only care whether the code itself still reads the same.
    const wanted = reference.code;

    const found = source.root.resolvePath(reference.path);
    const node =
        found !== undefined && found.toWordplay() === wanted
            ? found
            : uniqueNodeWithCode(source, wanted);
    if (node === undefined) return { state: 'invalid' };

    const lines = linesOfNode(source, node);
    return lines === undefined
        ? { state: 'invalid' }
        : { state: 'valid', source, node, ...lines };
}

/** The one node in this source whose code reads exactly like this, or nothing
 *  when there are none or when two of them are in different places.
 *
 *  Nesting is not ambiguity: a name, the names holding it, and the token
 *  holding that all serialize alike, and so do an expression and the statement
 *  around it. The outermost of a nested run is the one someone meant. Two
 *  matches neither of which contains the other genuinely give no way to choose,
 *  and choosing anyway is the silent-repointing failure this whole function
 *  exists to avoid. */
function uniqueNodeWithCode(source: Source, code: string): Node | undefined {
    if (code.length === 0) return undefined;
    let found: Node | undefined = undefined;
    for (const node of source.nodes()) {
        if (node.toWordplay() !== code) continue;
        if (found === undefined) found = node;
        else if (source.root.hasAncestor(found, node)) found = node;
        else if (!source.root.hasAncestor(node, found)) return undefined;
    }
    return found;
}

/** Where a node sits, in the 1-based line numbers the editor shows. */
export function linesOfNode(
    source: Source,
    node: Node,
): { firstLine: number; lastLine: number } | undefined {
    const tokens = node.nodes((n): n is Token => n instanceof Token);
    const first = tokens[0];
    const last = tokens[tokens.length - 1];
    if (first === undefined || last === undefined) return undefined;
    const firstLine = source.spaces.getLineNumber(first);
    const lastLine = source.spaces.getLineNumber(last);
    return firstLine === undefined || lastLine === undefined
        ? undefined
        : { firstLine, lastLine };
}

/**
 * What a selection in the editor is a reference to.
 *
 * A caret is one of three things and each means something different here: a
 * selected node is itself, a range is the smallest node that covers all of it,
 * and a bare position — a click in the middle of a line, which is what most
 * people do — is the expression the caret is inside. The rule has to give a
 * *node* whatever the caret is, because a node is the only thing that survives
 * the code being edited around it.
 */
export function referenceTargetOf(caret: Caret): Node | undefined {
    const position = caret.position;
    if (position instanceof Node) return position;

    const source = caret.source;
    if (Array.isArray(position)) {
        const [start, end] = [
            Math.min(position[0], position[1]),
            Math.max(position[0], position[1]),
        ];
        // The smallest node covering the whole selection, found by climbing
        // from wherever it starts until the node reaches its end.
        let node: Node | undefined = source.getTokenAt(start, false);
        while (node !== undefined) {
            const range = source.getRange(node);
            if (range !== undefined && range[0] <= start && range[1] >= end)
                return node;
            node = source.root.getParent(node);
        }
        return undefined;
    }

    // A bare position — a click in the middle of a line, which is what most
    // people do. "The line" is what they mean, so climb out of whatever small
    // thing the caret landed in (an operator, a number) to the largest
    // expression that still starts on the same line, stopping at the block that
    // holds it. Stopping there is what keeps a click inside a function body
    // from referring to the whole function.
    let node: Node | undefined =
        caret.getExpressionAt() ?? caret.tokenExcludingSpace;
    if (node === undefined) return undefined;
    const line = source.getLine(node);
    let parent = source.root.getParent(node);
    while (
        parent !== undefined &&
        !(parent instanceof Block) &&
        !(parent instanceof Program) &&
        !(parent instanceof Source) &&
        source.getLine(parent) === line
    ) {
        node = parent;
        parent = source.root.getParent(node);
    }
    return node;
}

/** How a reference is written in a message: "line 4", or "lines 3–5" for a
 *  run — the word rather than an "L4" shorthand a learner has no reason to
 *  know. The numbers are worked out from where the code is *now*, never stored:
 *  that is what makes a reference still true after the file above it changes. */
export function referenceLabel(
    locales: Locales,
    firstLine: number,
    lastLine: number,
): string {
    return firstLine === lastLine
        ? locales
              .concretize((l) => l.ui.collaborate.reference.line, {
                  line: firstLine,
              })
              .toText()
        : locales
              .concretize((l) => l.ui.collaborate.reference.lines, {
                  first: firstLine,
                  last: lastLine,
              })
              .toText();
}
