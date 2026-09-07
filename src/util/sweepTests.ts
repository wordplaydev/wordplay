/**
 * The test files that run in the `sweep` project, and the only ones that do.
 *
 * A sweep's cost scales with the committed corpus — `static/examples/**` and
 * `static/locales/**` — rather than with the code under test, so no ordinary
 * source edit can change its answer. That is the whole criterion, and it is
 * deliberately not "is slow": a slow-files list has no principle to appeal to and
 * would drift forever. These five were 172 of the suite's 318 CPU-seconds, and
 * one of them was the entire wall clock, so `npm run test:run` no longer runs
 * them. What runs them instead is the commit that can actually break one: the
 * pre-commit hook, on the corpus you staged, and the `sweep` CI job, whole.
 *
 * Slow files that are deliberately NOT here, so nobody re-litigates:
 *
 * - `drift.test.ts` (7.4s) and `exampleFreshness.test.ts` (4.3s) are slow from
 *   spawning throwaway git repos per test. They test the drift logic itself, and
 *   a real bug in that gate would ship silently if they left the default run.
 * - `retargetExampleNames.test.ts` (4.1s) tests the very module two of the sweeps
 *   depend on. It stays in `fast` precisely BECAUSE they left.
 * - `creatable.test.ts` (16.2s) and `examples.test.ts` (5.2s) enumerate node types
 *   and the 75 hand-authored masters — code and source, not generated corpus.
 *
 * Paths are repo-relative with forward slashes, matching src/util/isolatedTests.ts.
 */
const SweepTests = [
    'src/components/app/Showcase.locales.test.ts',
    'src/edit/markup/markupCorpus.test.ts',
    'src/examples/localizedExamples.test.ts',
    'src/util/verify-locales/exampleNamesSync.test.ts',
    'src/util/verify-locales/localeArtifactsSync.test.ts',
    'src/util/verify-locales/localizedExamplesSync.test.ts',
];

/**
 * The marker a sweep declares in its own TSDoc: `@sweep <corpus root> <reason>`.
 * Duration can't be checked from source; what can is that the file names which
 * corpus it sweeps — which is the question whose answer decides whether it
 * belongs here at all. `sweepConvention.test.ts` holds the marker and the list
 * together in both directions.
 */
export const SweepMarker =
    /^[ \t]*\*[ \t]*@sweep[ \t]+(static\/(?:examples|locales))[ \t]+\S/m;

/**
 * The staged paths that must make the pre-commit hook run the sweep, as the
 * literal fragments of that hook's `grep -qE` pattern. Kept here rather than only
 * in the hook so the two have one source: taking a sweep out of the default run is
 * only safe while staging its corpus still runs it.
 */
export const SweepTriggers = [
    'static/examples/',
    'static/locales/',
    'src/locale/en-US\\.json',
    'src/util/verify-locales/',
    'src/examples/',
];

export default SweepTests;
