import { readFileSync } from 'fs';
import { expect, test } from 'vitest';

/**
 * Every output the stage draws must also be drawn while it leaves.
 *
 * `Animator` collects exiting output by asking whether it has an `exiting` pose, and
 * nothing there knows one kind of output from another — so anything `GroupView` renders
 * can land in that map. `StageView` renders it through two `instanceof` ladders of its
 * own, and a kind missing from them doesn't fail: it vanishes the instant it leaves,
 * while everything beside it fades. `Shape` was missing from both for as long as shapes
 * have had poses, and adding `Image` beside it would have made that two.
 *
 * Read from the source because this is markup — there is no seam to call — and the two
 * ladders are otherwise only exercised by a stage that is mid-transition, which no unit
 * test can reach and only a real browser renders.
 */
const stage = readFileSync('src/components/output/StageView.svelte', 'utf8');
const group = readFileSync('src/components/output/GroupView.svelte', 'utf8');

/** The output kinds `GroupView` dispatches on, which is what can reach the stage at all. */
const drawn = [
    ...new Set(
        [...group.matchAll(/child instanceof (\w+)/g)].map((match) => match[1]),
    ),
];

/** The kinds the exiting ladders handle. `info.output` appears nowhere else. */
const exiting = [...stage.matchAll(/info\.output instanceof (\w+)/g)].map(
    (match) => match[1],
);

test('GroupView draws something, so the list below is not vacuously satisfied', () => {
    expect(drawn.length).toBeGreaterThanOrEqual(4);
    expect(drawn).toContain('Phrase');
});

test.each(
    // A Stage inside a Group is rendered as a Group and exits as one, so it needs no
    // ladder arm of its own.
    drawn.filter((kind) => kind !== 'Stage'),
)('%s is drawn while it leaves, on the stage and in the overlay', (kind) => {
    expect(
        exiting.filter((each) => each === kind),
        `StageView's exiting ladders should both handle ${kind}`,
    ).toHaveLength(2);
});
