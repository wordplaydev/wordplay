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
 *
 * The three page budgets' later +0.01MB is the adjustable brush and eraser
 * (#898): the brush geometry went into characters/paths.ts, which the character
 * pages reach, and its slider's labels into en-US.json, which every page
 * carries. No new file and no new subgraph — the same kind of move as the
 * entries above.
 *
 * The layout's and Page's +0.01MB is the symbol tool (#924): the glyph shape's
 * schema and rendering went into Character.ts, which the database reaches, and
 * the tool's font, weight and insertion labels into en-US.json. This is the
 * same move #774 made for character path curves, for the same feature. Image
 * import becoming a mode of its own rather than a command added one more label,
 * tip and instruction to the same file, which is the last +0.01MB here.
 *
 * Every page's +2 files is the two settings modules folders needed (#831):
 * ProjectFoldersSetting and ProjectSortSetting, reached through
 * SettingsDatabase like every other setting. Both are leaves — a type, a
 * validator, and a Setting — so they add no subgraph, only themselves.
 *
 * The last +1 file is linkHref.ts, the one place that turns a URL token in
 * markup into an href — an email's `mailto:`, the schemeless internal-path
 * convention, and the scheme allowlist. Every page reaches markup, so every
 * page reaches it; it imports nothing but a regex from the tokenizer.
 *
 * The +1 file on every entry is the creator's moderation record (#193), which
 * Database watches for whoever is signed in: one module holding a $state
 * object and a snapshot listener, reached the same way notifications are. The
 * bytes are its text — what a warning means, what losing public sharing means,
 * and how to ask for it back — in en-US.json, which every page carries.
 *
 * The last +0.01MB on every entry is "test it" (#1044): the button's label and
 * tip, the note explaining what a scratch project is, and the way back to the
 * guide, all in en-US.json. No new file reaches these entries — the scratch
 * module itself is pulled in by the guide, not by the layout.
 *
 * The bytes move with them, plus the folder and sort strings in en-US.json
 * that every page carries. The projects page's larger +0.03MB is its own five
 * modules and its own share of that text.
 *
 * The projects page's further +5 is the folder feature itself: the folder
 * component, the group controls, the two pure modules that group and order
 * projects, and the announcement builders. All are that page's own; nothing
 * else imports them.
 *
 * Page's next +0.01MB is per-project research consent (#922): a subheader, an
 * explanation, a two-mode toggle, and the paragraphs on the rights page that
 * explain what consenting means, all in en-US.json, which every page carries.
 * No new file and no new subgraph — the same move as the three entries above.
 * Consent text is deliberately long: it is a permission a creator gives, so it
 * says plainly what it covers and what turning it off can and cannot undo.
 *
 * The last +1 file is the cloud badge marking a setting that follows a creator's
 * account (#231): one component reached through the settings dialog, which Page
 * mounts, so it lands on every entry that reaches Page. It is a leaf — an emoji,
 * the tip it already shares with every other widget, and the signed-in check —
 * so it adds only itself and no subgraph. The layout doesn't reach Page and so
 * doesn't move at all; the landing page does reach it, but its file budget had a
 * unit of slack, so only its bytes needed to move. Those bytes are the badge's
 * two sentences in en-US.json, which every entry carries, and they are what tips
 * three of the byte budgets over a hundredth of a megabyte.
 *
 * The last +0.01MB on the layout and Page is choosing whether an inserted emoji
 * is color or monochrome: the mode's label, its two labels and its two tips in
 * en-US.json, which every page carries, plus the run kind that carries the
 * choice through to a font in unicode/emoji.ts, which every page reaches via
 * Emoji and EmojisRepaired. No new file and no new subgraph — the same move as
 * the entries above. The three page budgets had enough slack to absorb it.
 *
 * The last +2 files on every entry are the edit menu's reachability work: `values/numerals.ts`,
 * which holds the numeral tables both the tokenizer's number parsing and the menu's numeral
 * suggestions read (moved out of NumberValue, so its bytes moved rather than grew), and
 * `nodes/suggestionScope.ts`, the one-rule helper deciding whose scope a suggestion for a
 * neighbouring field comes from. Both are leaves reached from the editor, which every entry
 * already carries. The +0.01MB is the menu's new suggestion generators rather than those two
 * files: the numeral tables only moved out of NumberValue, but list and set access, table
 * update, previous, conversion targets, and the numeral encoder are all new code in nodes the
 * editor reaches. The layout's last hundredth is the unit-category table and the locale strings
 * naming each category, which every entry carries in en-US.json.
 *
 * Page's last +0.01MB buys no code at all: making interface chrome unselectable
 * added CSS comments to three components Page already reaches (MarkupHTMLView,
 * Subheader, CreatorView) explaining why each opts back out of the global
 * `user-select: none`. It reaches no new file and no new subgraph — the file
 * count is unchanged — and it deletes more declarations than it adds. Page had
 * 23 bytes of headroom, so a rule that would otherwise read as unexplained
 * couldn't be justified in place without this. The other four entries absorbed
 * it with the slack they had.
 *
 * Adapting project output to a dark canvas (#65) adds three small files to
 * every entry — the OS color-scheme store, the setting, and the pure lightness
 * transform — and a fourth (adaptPreview) to the three that show project tiles.
 * The three tile-showing entries move a hundredth of an MB; the other two
 * absorb it in the slack they had. The transform deliberately
 * lives in its own module rather than on `Color`, because a project tile paints
 * a persisted preview string and must not drag the whole Color structure
 * definition (or colorjs.io, which an earlier draft did pull in here) onto a
 * page that never evaluates a program.
 *
 * Audible re-evaluation cues (#537) add exactly one file to every entry: the
 * setting that turns them on, reached through the settings dialog. The cues
 * themselves — the sound table, the Web Audio graph that renders it, and the
 * driver that watches for reactions — hang off ProjectView, which none of these
 * entries reach, so a page that never evaluates a program carries none of it.
 * The +0.01MB on four of the five is that setting's mode row in en-US.json (a
 * label, two labels, two tips, and a subheader) plus the sentence about cues in
 * the evaluation tour, which every page carries; the landing page had enough
 * slack to absorb it.
 *
 * Making animation audible costs no new file at all — its setting sits in the
 * file the cues setting already occupies, and the figure mapping and the
 * animation layer it hooks hang off ProjectView, which none of these entries
 * reach. The landing page's last hundredth is the second mode row in
 * en-US.json, which is the slack it had been living on since the row above.
 *
 * The +1 file across all five (#298) is faceWords.ts, which says in words what a
 * typeface looks like for creators who can't see it. It is the same kind of move
 * as the three above: one small file whose only imports — the generated face
 * registry and a locale type — were already inside chrome via Fonts.ts, which
 * the settings dialog reaches to render the font chooser. Not a new subgraph.
 * Its ~0.01MB is the same shape as the row above: the module itself, thirty new
 * terms in en-US.json, and four fields per pickable face in faces.generated.ts —
 * a fixed vocabulary rather than a description per font, which is what keeps it
 * to one step instead of growing with the catalogue.
 */
test.each([
    ['src/routes/+layout.svelte', 488, 3.5],
    ['src/components/app/Page.svelte', 510, 3.74],
    ['src/routes/[[locale]]/+page.svelte', 525, 3.83],
    ['src/routes/[[locale]]/galleries/+page.svelte', 528, 3.83],
    ['src/routes/[[locale]]/projects/+page.svelte', 536, 3.86],
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
