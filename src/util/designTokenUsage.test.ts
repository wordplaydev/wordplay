import { expect, test } from 'vitest';
import {
    describeRawLength,
    findRawLengths,
} from '../../scripts/check-design-tokens';

/**
 * Chrome spaces itself by the scale in `src/app.html`, not by raw lengths.
 *
 * Nothing guarded this until #1419: the spacing tokens were about 89% adopted
 * and the long tail had never once failed a build, so it could only grow. The
 * guard lands with a budget rather than a clean gate because the remaining
 * findings are a *judgement* each — is this em relative to the type or to the
 * chrome? — and requiring all of them before the guard could land would mean a
 * forty-file change nobody can review, or no guard at all.
 *
 * The budget's output WAS the worklist, and it reached zero: every chrome
 * distance is now a step from the scale or carries a written reason why it
 * belongs to a different one. The first test below is the gate that keeps it
 * there.
 */

/**
 * Distances someone argued belong to a different scale — the type's, the output
 * coordinate space's, the creator's editor font. Raising it means a reviewer
 * agreed with a new argument; unlike the untokenized budget this replaced, it
 * has no terminus and is not meant to reach zero.
 */
const ScaleBudget = 52;

test('chrome spacing is a token, or says which scale it belongs to instead', () => {
    const { untokenized } = findRawLengths();
    expect(
        untokenized.map((v) => describeRawLength(v)),
        'Chrome spacing written as a raw length instead of a step from the scale in src/app.html. Use a token, or explain the exception with a `/* scale: <reason> */` comment above it.',
    ).toEqual([]);
});

test('argued exceptions stay within budget', () => {
    const { marked } = findRawLengths();
    expect(
        marked.length,
        `More \`scale:\` exceptions than the budget allows. Each one is a claim that a distance belongs to some other scale; if that is true here too, raise ScaleBudget in the same change and say why in the review.\n\n${marked.map((v) => `  ${describeRawLength(v)}`).join('\n')}\n`,
    ).toBeLessThanOrEqual(ScaleBudget);
});

/**
 * A marker that stopped covering a raw length is not harmless: it sits above a
 * declaration silently exempting whatever is written there next. Same failure
 * the `physical:` hatch would have if nothing checked it.
 */
test('every scale: marker still explains a raw length', () => {
    const { stale } = findRawLengths();
    expect(
        stale.map((s) => `${s.file}:${s.line}`),
        'A `scale:` comment that no longer introduces a raw length. Delete it, or move it to what it explains.',
    ).toEqual([]);
});
