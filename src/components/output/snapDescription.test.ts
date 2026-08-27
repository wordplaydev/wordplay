import DefaultLocales from '@locale/DefaultLocales';
import { expect, test } from 'vitest';
import describeMove, {
    describeGuide,
    describeNoAlignment,
} from './snapDescription';
import type { Guide } from './snap';

function place(x: number, y: number) {
    return { x, y, z: 0 };
}

function guide(fields: Partial<Guide> = {}): Guide {
    return {
        axis: 'x',
        position: 1,
        anchor: 'left',
        targetAnchor: 'left',
        target: 'dog',
        span: { from: 0, to: 1 },
        ...fields,
    };
}

test('a guide names both parts and the output it met', () => {
    const text = describeGuide(DefaultLocales, guide());
    expect(text).toContain('left edge');
    expect(text).toContain('dog');
});

test('a grid guide names the grid rather than an output', () => {
    const text = describeGuide(
        DefaultLocales,
        guide({ target: undefined, targetAnchor: undefined }),
    );
    expect(text).toContain('grid');
    expect(text).not.toContain('dog');
});

test('a baseline snap says baseline', () => {
    expect(
        describeGuide(
            DefaultLocales,
            guide({ axis: 'y', anchor: 'baseline', targetAnchor: 'baseline' }),
        ),
    ).toContain('baseline');
});

test('an unconstrained move still says where it landed', () => {
    expect(describeMove(DefaultLocales, [], place(1.5, -2))).toBe('1.5m -2m');
});

/**
 * The rule that makes or breaks this feature: a live region that hasn't
 * changed is silent, so two consecutive announcements over different state
 * must differ. Asserting one call's content passes happily while the feature
 * is inaudible.
 */
test('two consecutive moves are never the same words', () => {
    const first = describeMove(DefaultLocales, [guide()], place(1, 0));
    const second = describeMove(DefaultLocales, [guide()], place(1, 0.5));
    expect(first).not.toBe(second);
});

test('the same place against a different output is not the same words', () => {
    const first = describeMove(DefaultLocales, [guide()], place(1, 0));
    const second = describeMove(
        DefaultLocales,
        [guide({ target: 'cat' })],
        place(1, 0),
    );
    expect(first).not.toBe(second);
});

test('there is a way to say nothing lies that way', () => {
    const left = describeNoAlignment(DefaultLocales, 'x', -1);
    const up = describeNoAlignment(DefaultLocales, 'y', 1);
    expect(left).toContain('left');
    expect(up).toContain('up');
    expect(left).not.toBe(up);
});
