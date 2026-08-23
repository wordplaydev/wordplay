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
 * few KB to LocaleSearch, which the footer's chooser imports, the keyword
 * canonical-symbol fixes (#1296, #1298) added a few KB to the tokenizer/parser,
 * the stage zoom feedback (#1175) added a few strings to en-US.json, which
 * every page carries, the footer nav tabs (#836) added a few KB of CSS to
 * Link and Toggle, which every page renders, and the text case functions
 * (#1301) and the text slicing/searching functions added their documentation to
 * en-US.json, the richer landing page (#921) added its tour examples and
 * feature list there, which is why all five budgets moved by about 10KB at once,
 * and character path curves (#774) added their schema and rendering to
 * Character.ts, which the database reaches, plus the point editor's strings to
 * en-US.json. The complete unit conversions (#363) are the same: they replaced
 * 46 per-conversion sentences in en-US.json with one template and a list of 125
 * unit names, which is a net few hundred bytes — the ~200 conversions themselves
 * are in the basis, which chrome does not reach. Raise a budget only for that, never to accommodate the
 * language runtime leaking back in — the runtime-reachability test below is what
 * guards the 2MB this file exists for, and it must stay green whatever these
 * numbers say.
 *
 * A *file* budget may move by one for the same reason, and only for the same
 * reason: #1175 extracted OverflowToolbar's fit policy into its own module so it
 * could be tested without a layout engine, #836 did the same for Link's
 * active/section logic, and #1301 did the same for the one rule deciding what
 * locale a case conversion uses. Each is one small file already inside chrome
 * that imports nothing — not a new subgraph. Any larger jump in a file
 * count is a door opening, and the chain that opened it is what the failure
 * message is for.
 *
 * The landing page's +4 (#921) is the one larger move, and it is the same kind:
 * the page gained a stage, its drifting cast, a feature-list block, and the
 * one-line module holding the cast's glyphs, while giving up the old full-page
 * Background. Each imports only what the page already had. The 2MB of runtime
 * the new stage can show is *not* in that number, and must never be: it lives
 * behind the dynamic import guarded by the test below.
 *
 * The landing page's later +0.01MB is StageCast holding its cast back until the
 * page has settled: two more stores read from Database, which the page already
 * reached, and the frame watcher deciding when to start. No new file, and no
 * new subgraph.
 */
test.each([
    ['src/routes/+layout.svelte', 477, 3.41],
    ['src/components/app/Page.svelte', 498, 3.63],
    ['src/routes/[[locale]]/+page.svelte', 514, 3.72],
    ['src/routes/[[locale]]/galleries/+page.svelte', 515, 3.71],
    ['src/routes/[[locale]]/projects/+page.svelte', 518, 3.71],
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

test("the landing page's carousel stays behind its dynamic import", () => {
    // The carousel is the one thing on the landing page that runs a program, so
    // it reaches the evaluator, the output layer, and the editor's node views.
    // It may only ever be loaded through `showcase.ts`'s `import()`; a static
    // import of it anywhere on the page's graph would put all of that back into
    // what a first-time visitor downloads, and the reachability test below
    // would fail with it.
    const reach = reachFrom('src/routes/[[locale]]/+page.svelte', Root);
    expect(reach.files.has('src/components/app/Showcase.svelte')).toBe(false);
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
