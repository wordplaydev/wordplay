import getFocusNode from '@components/annotations/getFocusNode';
import type { Resolution } from '@conflicts/Conflict';
import Markup from '@nodes/Markup';
import Source from '@nodes/Source';
import { expect, test } from 'vitest';

const source = new Source('test', '1 + 2');
const fallback = source.expression;
const other = source.nodes().find((node) => node.toWordplay() === '2');

/** A description stub — getFocusNode never renders one, so empty markup says
 *  as much as anything else. */
const description = () => Markup.words('');

test('an explain resolution naming a focus node wins', () => {
    expect(other).toBeDefined();
    if (other === undefined) return;
    const resolutions: Resolution[] = [
        { kind: 'explain', description, focusNode: other },
    ];
    expect(getFocusNode(resolutions, fallback)).toBe(other);
});

test('an explain resolution without a focus node falls back', () => {
    const resolutions: Resolution[] = [{ kind: 'explain', description }];
    expect(getFocusNode(resolutions, fallback)).toBe(fallback);
});

test('a repair-only list falls back to the conflict’s own node', () => {
    // Repairs move the caret themselves, to the code they produced.
    const resolutions: Resolution[] = [
        {
            kind: 'repair',
            description,
            mediator: () => {
                throw new Error('not called');
            },
        },
    ];
    expect(getFocusNode(resolutions, fallback)).toBe(fallback);
});

test('the first focus node named wins', () => {
    expect(other).toBeDefined();
    if (other === undefined) return;
    const resolutions: Resolution[] = [
        { kind: 'explain', description },
        { kind: 'explain', description, focusNode: other },
    ];
    expect(getFocusNode(resolutions, fallback)).toBe(other);
});
