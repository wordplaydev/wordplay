import { expect, test } from 'vitest';
import { reachFrom, staticImportsOf } from './importGraph';

/**
 * Guards what a page has to download.
 *
 * The language runtime — basis, evaluator, nodes, output — is ~2MB of
 * JavaScript that only the editor, guide, and tutorial need. It reaches every
 * other page through shared chrome, and one stray value import puts it back.
 * These tests pin the current reach so that work to shrink it shows up as a
 * tightened budget, and so an accidental re-entry fails here with the import
 * chain that caused it rather than as a mystery in a bundle report.
 *
 * When a budget below drops, tighten it in the same change.
 */

const Root = process.cwd();

/** Modules that carry the language runtime with them. */
const Runtime = {
    basis: 'src/basis/Basis.ts',
    evaluator: 'src/runtime/Evaluator.ts',
    stage: 'src/output/Output/Stage.ts',
    templates: 'src/concepts/Templates.ts',
    project: 'src/db/projects/Project.ts',
    commands: 'src/components/editor/commands/Commands.ts',
};

test('type-only imports are not edges, but value imports are', () => {
    expect(staticImportsOf("import type X from 'a';")).toEqual([]);
    expect(staticImportsOf("import { type X, type Y } from 'a';")).toEqual([]);
    expect(staticImportsOf("import X from 'a';")).toEqual(['a']);
    expect(staticImportsOf("import { type X, y } from 'a';")).toEqual(['a']);
    expect(staticImportsOf("import X, { type Y } from 'a';")).toEqual(['a']);
    expect(staticImportsOf("import 'a';")).toEqual(['a']);
    expect(staticImportsOf("export { x } from 'a';")).toEqual(['a']);
    // Deferred by design: a dynamic import is its own chunk.
    expect(staticImportsOf("const m = await import('a');")).toEqual([]);
    expect(staticImportsOf("// import X from 'a';")).toEqual([]);
});

test('the shortcut helpers stay free of the command table', () => {
    // Toggle and CommandButton render shortcuts on pages that have no editor;
    // importing Commands for them reaches Caret and Project.
    const reach = reachFrom(
        'src/components/editor/commands/shortcuts.ts',
        Root,
    );
    expect(Array.from(reach.files)).toEqual([
        'src/components/editor/commands/shortcuts.ts',
    ]);
});

test('resolving a color needs no basis', () => {
    // Character (reachable from the database) and Page both format LCH colors;
    // going through Color for it pulls the whole basis.
    const reach = reachFrom('src/output/Color/lch.ts', Root);
    expect(reach.files.has(Runtime.basis)).toBe(false);
});

/**
 * Current reach, in files and source bytes. These are budgets, not targets:
 * they may only go down. The `true` expectations record which runtime modules
 * are still reachable today — as each door closes, flip it to `false`.
 *
 * The one exception is a feature that genuinely adds code to chrome every page
 * already carries: the language chooser's request-form matching (#1256) added a
 * few KB to LocaleSearch, which the footer's chooser imports. Raise a byte
 * budget only for that, never to accommodate a new *module* leaking in — the
 * file counts and the runtime-reachability test below are what guard the 2MB
 * language runtime this file exists for.
 */
test.each([
    ['src/routes/+layout.svelte', 475, 3.35],
    ['src/components/app/Page.svelte', 495, 3.56],
    ['src/routes/[[locale]]/+page.svelte', 510, 3.61],
    ['src/routes/[[locale]]/galleries/+page.svelte', 515, 3.65],
    ['src/routes/[[locale]]/projects/+page.svelte', 515, 3.65],
])('%s stays within its import budget', (entry, maxFiles, maxMB) => {
    const reach = reachFrom(entry, Root);
    expect(
        reach.files.size,
        `${entry} reaches ${reach.files.size} files`,
    ).toBeLessThanOrEqual(maxFiles);
    expect(
        reach.bytes / 1024 / 1024,
        `${entry} carries ${(reach.bytes / 1024 / 1024).toFixed(2)}MB`,
    ).toBeLessThanOrEqual(maxMB);
});

test('no page-wide chrome reaches the language runtime', () => {
    // The layout, the footer, and the landing page are what every visitor
    // loads. None of them runs code, so none of them may carry the machinery
    // that does. Each of these was a real door once: markup rendering pulled
    // the editor and evaluator, the database built projects eagerly, and the
    // footer's notifications named projects by constructing them.
    for (const entry of [
        'src/routes/+layout.svelte',
        'src/components/app/Page.svelte',
        'src/routes/[[locale]]/+page.svelte',
        // Listing projects doesn't require being able to run them: these
        // render from stored data and load the runtime only on an action.
        'src/routes/[[locale]]/galleries/+page.svelte',
        'src/routes/[[locale]]/projects/+page.svelte',
        'src/routes/[[locale]]/gallery/[galleryid]/+page.svelte',
    ]) {
        const reach = reachFrom(entry, Root);
        for (const [name, target] of Object.entries(Runtime)) {
            const chain = reach
                .chainTo(target)
                ?.map((f) => f.split('/').pop())
                .join(' -> ');
            expect(
                reach.files.has(target),
                `${entry} reaches ${name} via ${chain}`,
            ).toBe(false);
        }
    }
});
