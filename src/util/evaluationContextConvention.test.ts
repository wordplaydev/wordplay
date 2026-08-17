import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';
import { expect, test } from 'vitest';

/**
 * Guard for the "an output host publishes its evaluation state" convention.
 *
 * `OutputView` decides whether anything is playing by reading the optional
 * evaluation context: `const playing = $derived($evaluation?.playing === true)`.
 * A component that renders an `OutputView` without calling `setEvaluation` in
 * its subtree leaves that context undefined, so `playing` is permanently false
 * — and everything gated on it goes quiet with no error and no clue. Music
 * never sounds, and the "tap for sound" affordance that would explain why is
 * itself gated on `playing`, so nothing appears.
 *
 * That is exactly how every act title card in the tutorial ended up silent
 * while still painting its stage: `PlayView` rendered `OutputView` and never
 * published. Nothing failed, because nothing was checking.
 */
const OUTPUT_VIEW = 'OutputView';
const PUBLISHES = 'setEvaluation';
/**
 * A `mini` OutputView is a thumbnail, and OutputView returns before acquiring a
 * player for one — so it has nothing to publish evaluation state *for*. This
 * exemption is narrow on purpose: it's the one case where silence is the design
 * rather than a defect.
 */
const EXEMPT = /<OutputView[^>]*\bmini\b/s;

function svelteFilesUnder(directory: string): string[] {
    const found: string[] = [];
    for (const entry of readdirSync(directory)) {
        const path = join(directory, entry);
        if (statSync(path).isDirectory()) found.push(...svelteFilesUnder(path));
        else if (entry.endsWith('.svelte')) found.push(path);
    }
    return found;
}

test('every component that renders an OutputView publishes evaluation state', () => {
    const root = resolve(__dirname, '../..');
    const offenders = svelteFilesUnder(resolve(root, 'src'))
        .map((path) => [path, readFileSync(path, 'utf-8')] as const)
        // The ones that mount an OutputView themselves, not OutputView itself.
        .filter(
            ([path, text]) =>
                !path.endsWith(`${OUTPUT_VIEW}.svelte`) &&
                text.includes(`<${OUTPUT_VIEW}`),
        )
        .filter(([, text]) => !text.includes(PUBLISHES) && !EXEMPT.test(text))
        .map(([path]) => relative(root, path));

    expect(
        offenders,
        `Component(s) render an OutputView without calling ${PUBLISHES}(...). Their OutputView will read \`playing === false\` forever: music stays silent and the "tap for sound" affordance never appears. Publish an EvaluationContext the way PlayView and ProjectView do.`,
    ).toEqual([]);
});

/**
 * Guard for the "an output host names the source it is showing" convention.
 *
 * `OutputView` recovers the evaluations a frame never showed — several can
 * happen in one, since a @Collision or @Beat is answered the instant it
 * happens — by reading that source's value history. Without the source there
 * is no history to read, so a @Music.replay raised by one of those evaluations
 * is dropped and the sound effect simply never plays.
 *
 * It has the same failure mode as the convention above, which is why it is
 * guarded the same way: nothing errors, the stage still paints, and the sound
 * is just missing. This is how a save in Football was silent while the kick,
 * which rode a clock tick, was not.
 */
test('every component that renders an OutputView names its source', () => {
    const root = resolve(__dirname, '../..');
    const offenders = svelteFilesUnder(resolve(root, 'src'))
        .map((path) => [path, readFileSync(path, 'utf-8')] as const)
        .filter(
            ([path, text]) =>
                !path.endsWith(`${OUTPUT_VIEW}.svelte`) &&
                text.includes(`<${OUTPUT_VIEW}`),
        )
        // Either spelling of the prop: `{source}` or `source={…}`.
        .filter(([, text]) => !/<OutputView[^>]*\bsource[}=]/s.test(text))
        .map(([path]) => relative(root, path));

    expect(
        offenders,
        `Component(s) render an OutputView without passing \`source\`. Any @Music.replay raised by an evaluation that another replaced within the same frame — a collision, a beat, a chain of stream reactions — will never reach the player, silently.`,
    ).toEqual([]);
});
