import retryableLoad from '@util/retryableLoad';

/**
 * The landing page's carousel, loaded only when a visitor asks for it.
 *
 * `Showcase.svelte` reaches Project, Evaluator, and the whole output layer —
 * roughly 2MB that nobody reading the page needs. Keeping the reference behind a
 * dynamic `import()` puts it in its own chunk, which is both what keeps the
 * landing page's bundle honest and what lets `importGraph.test.ts` keep
 * asserting that the page reaches none of the runtime.
 *
 * Memoized at module scope but never awaited there: a module-level await
 * anywhere in the app graph reorders WebKit's module evaluation across the
 * route/db import cycle and crashes hydration.
 */
export const loadShowcase = retryableLoad(() =>
    import('@components/app/Showcase.svelte').then((module) => module.default),
);
