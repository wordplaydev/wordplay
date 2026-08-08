import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';
import { expect, test } from 'vitest';

/**
 * Guard for the "whoever constructs an Evaluator stops it" convention.
 *
 * `Evaluator.tick()` ends with `if (this.reactive && !this.#stopped) this.later(...)`, so a
 * reactive evaluator with a temporal stream re-arms itself on every animation frame for as long
 * as the page lives. Dropping the reference does not stop it — nothing else will.
 *
 * The tutorial found this the expensive way: `PlayView` stopped its evaluator when its *project*
 * changed but never when the component was destroyed, and the tutorial destroys it on every step.
 * Each act title card with a falling cast or a raining emoji left a whole program re-evaluating
 * behind it, sixty times a second, forever — so paging through the tutorial got steadily slower
 * and eventually took the tab down. No test noticed, because everything still rendered correctly.
 *
 * A component that constructs one must therefore also stop it on destroy.
 */
const CONSTRUCTS = /new Evaluator\(/;
const STOPS = /\.stop\(\)/;
const ON_DESTROY = /onDestroy\(/;

function svelteFilesUnder(directory: string): string[] {
    const found: string[] = [];
    for (const entry of readdirSync(directory)) {
        const path = join(directory, entry);
        if (statSync(path).isDirectory()) found.push(...svelteFilesUnder(path));
        else if (entry.endsWith('.svelte')) found.push(path);
    }
    return found;
}

test('every component that constructs an Evaluator stops it on destroy', () => {
    const root = resolve(__dirname, '../..');
    const offenders = svelteFilesUnder(resolve(root, 'src'))
        .map((path) => [path, readFileSync(path, 'utf-8')] as const)
        .filter(([, text]) => CONSTRUCTS.test(text))
        .filter(([, text]) => !(ON_DESTROY.test(text) && STOPS.test(text)))
        .map(([path]) => relative(root, path));

    expect(
        offenders,
        `Component(s) construct an Evaluator without stopping it in onDestroy. An unstopped reactive evaluator re-arms tick() every animation frame for the life of the page, so each time the component is destroyed it leaves a whole program evaluating forever.`,
    ).toEqual([]);
});
