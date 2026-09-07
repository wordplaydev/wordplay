import getNodeView from '@components/editor/nodes/nodeToView';
import Templates from '@concepts/Templates';
import UnknownNodeView from '@components/editor/nodes/UnknownNodeView.svelte';
import { markupToSource } from '@edit/markup/markupSource';
import type Node from '@nodes/Node';
import Source from '@nodes/Source';
import { expect, test } from 'vitest';

/**
 * A node type with no entry in nodeToView falls through to UnknownNodeView, which
 * renders the node's descriptor on an error background. Nothing announces that —
 * the editor simply shows a red box where content should be — which is how
 * `Mention` and `Branch` went unnoticed even though every templated locale string
 * (`$name`, `$#count[…|…]`) contains one.
 */

/** Markup exercising every segment type the parser can produce. */
const EveryMarkupSegment = [
    'plain words',
    '*bold* /italic/ _underline_ ^extra^ ~light~',
    'a @Phrase concept, a @Color.random member, a @U/1F600 codepoint',
    'a <label@https://wordplay.dev> link',
    'a bare https://wordplay.dev url and a hi@wordplay.dev address',
    'an example \\1 + 1\\ and a starred one \\1 + 1\\⭐',
    'an external example \\py| a = 5\\js| let a = 5;\\',
    'a $mention and a $#count[one thing|many things] branch',
    '• a bullet',
].join('\n\n');

function unviewable(nodes: Node[]): string[] {
    return [
        ...new Set(
            nodes
                .filter((n) => getNodeView(n).component === UnknownNodeView)
                .map((n) => n.getDescriptor()),
        ),
    ].sort();
}

test('every node in markup has a view', () => {
    expect(unviewable(markupToSource(EveryMarkupSegment).nodes())).toEqual([]);
});

test('every node in a program with documentation has a view', () => {
    // The same markup nodes reach the code editor through a doc, which is where
    // the Mention and Branch gap was actually visible.
    const source = new Source(
        'test',
        '¶A doc with a $mention and a $#count[a|b] branch.¶\n1 + 1',
    );
    expect(unviewable(source.nodes())).toEqual([]);
});

test('every node a creator can drag from the palette has a view', () => {
    // Templates are the blocks-mode palette's node instances, so this covers the
    // creatable types generally rather than only the markup ones above.
    expect(
        unviewable(Templates.flatMap((template) => template.nodes())),
    ).toEqual([]);
});
