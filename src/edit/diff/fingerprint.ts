import type Node from '@nodes/Node';
import Token from '@nodes/Token';

/**
 * What makes two nodes the same node across two *independent parses*.
 *
 * `Node.id` is a global counter assigned at construction and `Node.hash()`
 * bottoms out in that id, so neither survives the reparse a checkpoint's stored
 * code goes through — two byte-identical sources hash completely differently.
 * The checkpoint diff therefore needs its own digest, built only from what a
 * node *is*: its descriptor (the stable class name), and for a token its
 * candidate symbols and canonical text.
 */

/** Memoized because nodes are immutable, so a digest can never go stale. */
const fingerprints = new WeakMap<Node, string>();

/**
 * A 53-bit hash (cyrb53), rendered base 36. A digest is a fixed-size string
 * rather than the subtree's text because a parent's digest is built from its
 * children's: concatenating them would make the Program's digest as long as the
 * whole source, and `static/examples/Lyrics.wp` is a single 130,866-node file.
 *
 * Two distinct subtrees collide with probability around one in a million at
 * that size, and the consequence is that one reports as unchanged — a missing
 * mark, not a wrong program.
 */
function hash(text: string): string {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < text.length; i++) {
        const character = text.charCodeAt(i);
        h1 = Math.imul(h1 ^ character, 2654435761);
        h2 = Math.imul(h2 ^ character, 1597334677);
    }
    h1 =
        Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
        Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 =
        Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
        Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** One part of a digest's input, prefixed with its length so it cannot blur
 *  into the next. */
function part(text: string): string {
    return `${text.length}:${text}`;
}

/** The digest of a subtree. */
export default function fingerprint(node: Node): string {
    const memoized = fingerprints.get(node);
    if (memoized !== undefined) return memoized;

    // Parts are length-prefixed rather than joined with a separator character,
    // because a token's text may contain any character at all — including
    // whatever would have been chosen as the separator — and a digest two
    // different trees can share is a change reported as no change.
    const computed = hash(
        node instanceof Token
            ? // `types` and not just the text, because a `?` lexed as a
              // BooleanType and a `?` lexed as a Conditional are different
              // code; `getCanonicalText` and not `getText`, because a typed
              // `true` and a typed symbol are the same token.
              part('Token') +
                  part(node.types.join('|')) +
                  part(node.getCanonicalText())
            : part(node.getDescriptor()) +
                  part(node.getChildren().map(fingerprint).join('')),
    );

    fingerprints.set(node, computed);
    return computed;
}
