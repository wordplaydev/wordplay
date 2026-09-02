/**
 * Node-pairing helpers shared by the locale pipeline's deterministic example
 * retargeting (`retargetExampleNames`) and the gallery examples' load-time
 * compositing (`compositeExample`, #1310). Both pair two parses of "the same"
 * program positionally and need the same two things: a node sequence with
 * markup contents left out, and node bounds in grapheme space.
 */

import Markup from '@nodes/Markup';
import type Node from '@nodes/Node';
import type Source from '@nodes/Source';

/**
 * A source's nodes with everything inside a `Markup` removed, keeping the
 * `Markup` itself.
 *
 * Doc prose is the one part of an example whose node count a translation
 * legitimately changes, since markup emits a `Words` token per line and
 * translations reflow paragraphs freely.
 */
export function withoutMarkupContents(source: Source): Node[] {
    const nodes = source.nodes();
    const inside = new Set<Node>();
    for (const node of nodes)
        if (node instanceof Markup)
            for (const descendant of node.nodes())
                if (descendant !== node) inside.add(descendant);
    return nodes.filter((node) => !inside.has(node));
}

/** A node's start, in the grapheme space its source counts positions in. */
export function startOfNode(source: Source, node: Node): number | undefined {
    const first = node.leaves()[0];
    return first === undefined ? undefined : source.getTokenTextPosition(first);
}

/** A node's end, in the grapheme space its source counts positions in. */
export function endOfNode(source: Source, node: Node): number | undefined {
    const last = node.leaves().at(-1);
    return last === undefined ? undefined : source.getTokenLastPosition(last);
}
