import { expect, test } from 'vitest';
import { align, alignAffixed } from '@util/align';

const id = (s: string) => s;

/** The shape of an alignment, as a string, so two can be compared at a glance. */
function shape(steps: ReturnType<typeof align<string>>): string {
    return steps
        .map((step) =>
            step.kind === 'keep'
                ? `=${step.source}`
                : step.kind === 'insert'
                  ? `-${step.source}`
                  : `+${step.target}`,
        )
        .join('');
}

test.each([
    [[], []],
    [['a'], []],
    [[], ['a']],
    [
        ['a', 'b', 'c'],
        ['a', 'b', 'c'],
    ],
    [
        ['a', 'b', 'c'],
        ['a', 'x', 'c'],
    ],
    [
        ['a', 'b', 'c'],
        ['x', 'y', 'z'],
    ],
    [
        ['a', 'b', 'c', 'd'],
        ['a', 'd'],
    ],
    [
        ['a', 'd'],
        ['a', 'b', 'c', 'd'],
    ],
    [
        ['a', 'b'],
        ['b', 'a'],
    ],
])(
    'alignAffixed agrees with align on %j / %j',
    (source: string[], target: string[]) => {
        expect(shape(alignAffixed(source, target, id))).toBe(
            shape(align(source, target, id)),
        );
    },
);

test('alignAffixed strips a long common prefix and suffix', () => {
    // One changed element in the middle of a thousand. A full table would be a
    // million cells; this is the case the checkpoint diff actually meets.
    const before = Array.from({ length: 1000 }, (_, i) => `item${i}`);
    const after = [...before];
    after[500] = 'changed';

    const steps = alignAffixed(before, after, id);
    expect(steps.filter((s) => s.kind !== 'keep')).toHaveLength(2);
    expect(shape(steps)).toBe(shape(align(before, after, id)));
});

test('alignAffixed keeps everything when the arrays are identical', () => {
    const items = ['a', 'b', 'c', 'd'];
    const steps = alignAffixed(items, [...items], id);
    expect(steps.every((step) => step.kind === 'keep')).toBe(true);
    expect(steps).toHaveLength(4);
});
