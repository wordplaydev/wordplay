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
 *
 * Paths on stage (#167) add **no file** to any of these five — the counts below are
 * unchanged, and nothing here reaches `Shape/Path.ts`, `Drawing.svelte.ts` or
 * `PathHandles.svelte`: a Form is only ever constructed by `createDefaultShares`, which
 * none of these entries evaluate, and drawing hangs off ProjectView, which none of them
 * reach either. Every hundredth of an MB it costs is en-US.json, which every page carries
 * — the `Path` block's docs and names, the two new `Shape` flags, one toolbar tip, and the
 * announcements for drawing a path and editing its points. Three of the five had the slack
 * to absorb it; Page and projects moved a hundredth for the form, galleries a hundredth
 * more for the point handles.
 *
 * Speech bubbles (#75) add **no file** to any of these five, and the counts
 * below are unchanged: `Bubble.ts` is only ever constructed by
 * `createDefaultShares`, which none of these entries evaluate, and
 * `AnimatedText.svelte` hangs off the stage's output views, which none of them
 * reach. The landing page's +0.01MB is en-US.json, which every page carries —
 * the `Bubble` block's docs and names for seven inputs, the `Phrase.bubble`
 * input, and the clause the description template gained so a spoken line is
 * described once rather than twice. The other four had the slack to absorb it.
 *
 * The layout's last +0.01MB is alignment guides (#117): the seven anchor words
 * and the four sentences naming what a moved output lined up with, in
 * en-US.json, which every page carries. The snapping itself is not in this
 * number and must not be — `snap.ts` and the three modules around it are
 * reached only from the stage's output views, so no entry here reaches them and
 * no file count moves. The other four budgets had enough slack to absorb the
 * text.
 *
 * Language and region names as tags (#1220) add **three files** to all five:
 * `locale/tagNames.ts`, the region-name table it indexes
 * (`locale/regionNames.generated.ts`), and `conflicts/UnknownRegion.ts`. These
 * are reached through `nodes/Language.ts`, which every one of these entries
 * already carries, and they have to be — a tag is resolved while conflicts are
 * computed, so the name tables cannot be deferred behind a dynamic import the
 * way a rarely-used view can. The +0.03MB is almost entirely the region table's
 * 19KB — 249 regions, each with its own-language name, the language that named
 * it, and CLDR's English name and alternates — plus the new conflict's strings
 * in en-US.json, which every page carries. It sits beside `LanguageCode.ts`,
 * which holds the same shape of data for languages, is four times larger, and
 * is already on every one of these pages.
 *
 * Completing a tag as it's typed adds **no file** and +0.01MB: the prefix
 * matcher in `tagNames.ts`, the completion method on `Language`, and the two
 * dispatch branches in `PossibleEdits.ts` all live in modules these entries
 * already carry. The file counts below are unchanged, which is the useful
 * signal — this is code weight, not new reach.
 *
 * Searching galleries (#299) adds **one file** to `galleries` alone —
 * `routes/[[locale]]/galleries/search.ts`, the `Searchable<Gallery>` adapter —
 * and no file anywhere else. Searching a public gallery's *projects* needs the
 * language runtime to parse them, and deliberately reaches it through the same
 * `DB.loadProjects()` dynamic import the examples search already used: the
 * "no page-wide chrome reaches the language runtime" test above is what caught
 * a static import of `ProjectsDatabase` for the collection name, which would
 * have put ~2MB on a page that shows gallery cards.
 *
 * Curated public galleries (#1311) add **no file** to any of these five and
 * +0.01MB across all of them: the gallery schema's new moderation fields and
 * the moderation state's shared zod schema live in `db/galleries/Gallery.ts`
 * and `db/projects/Moderation.ts`, which every one of these entries already
 * carries, and the new text sits in en-US.json, which every page carries. The
 * moderator's gallery queue and the curator's notice are their own route
 * components and reach none of these. File counts are unchanged, which is the
 * signal that matters — this is code and text weight, not new reach.
 *
 * The glossary forms editor (#1244) adds **no file** to any of these five —
 * `GlossaryFormsEditor.svelte` is reached only from `/localize`, which is not
 * an entry here — and one budget moves by 0.01MB: the fifteen strings the
 * editor needs, in en-US.json, which every page carries. `galleries` is simply
 * the entry that had no slack left; the other four absorbed the same text.
 *
 * Editable annotations (#1275) add **no file** to any of these five and move
 * each budget by 0.01MB, `galleries` (which had the least slack) by 0.02.
 * Modules every page already carried grew: the accessor reflection became a
 * recording proxy, `Markup` gained the source a concretized markup reports,
 * `MarkupHTMLView` and `LocalizedText` gained the derivation that reads it, and
 * `Node`, `Doc`, and `getDocLocales` gained the accessors they hand over —
 * together ~8KB of code and the reasoning for it. `DefaultLocale`, which the
 * reflection now reads to refuse a path en-US hasn't written, was already
 * reachable from all five and costs ~100 bytes of import. File counts are
 * unchanged, which is the signal that matters: this is weight, not reach.
 *
 * The landing page's last +0.01MB is localizing concept links off the index
 * (#572 fallout): `getConceptName` gained a lookup by concept id, and
 * `ConceptLinkUI` uses it where there is no `ConceptIndex` to resolve against —
 * which is every page in this table, since none of them may build one. Before
 * it, every `@Volume` and `@Phrase` on the landing page rendered its English id
 * in all 29 translated locales. Both files were already reachable from all five
 * entries, so the file counts do not move and no subgraph is added; the four
 * other budgets absorbed the same ~4.5KB without moving at all.
 *
 * Adding a locale (fa-AF, #1229) moves `+layout` and `projects` by 0.01MB and
 * the other three not at all. It adds no file and no subgraph — just ~76 bytes
 * in two modules every page already carried: one line in `SupportedLocales.ts`
 * and one in `choosePrompts.generated.ts`, whose Persian phrase is the larger
 * half. These two entries are simply the ones with less than that much slack.
 * Expect this pair to move again, by about this much, each time a locale lands.
 *
 * The durable notice inbox (#938) adds **three files** to every entry and moves
 * each byte budget a little. `Database` watches the signed-in creator's inbox
 * the same way it watches their strikes, so the three modules behind it —
 * the schema and its defensive reader, the pure function that turns a notice
 * into a route, and the store — are reachable from everything. None of them
 * imports a `Project`, which is the reachability the test below actually
 * guards. What they replace is not a module but code inside two databases: the
 * pushed writes that put a notification in a map the moment a snapshot arrived,
 * which is why a notification was lost on reload and why "clear all" meant two
 * different things. Expect this to come back down when the derived
 * chat-moderation walk goes away with the gallery dashboard.
 *
 * Converging chat moderation (#938) is **net +1 file** on every entry, and a
 * little weight with it. `ChatDatabase` now reaches the two callables that own
 * reporting and deciding — a participant naming their own reviewers, or setting
 * their own reported message back to `approved`, are things a client must not
 * be able to do — which is +2. Deleting `src/db/notifications.svelte.ts` gives
 * one back: the in-memory map it held, and the moderation queue exported from
 * the notification component beside it, are both replaced by server state.
 *
 * Delivering a decision to the people it is about (#938) moves `Page` and
 * `projects` by 0.01MB and adds no file. It is the text: four notice headers,
 * the two labels that introduce which rule a decision found broken and the
 * note that came with it, and the way in to the moderation queue — all in
 * `en-US.json`, which every entry carries. `Moderation.ts`, which the bell now
 * reads flag descriptions from, was already reachable from all five.
 *
 * Saying who moderates what (#938) moves `Page` by 0.01MB and nothing else. It
 * adds no file: the rights page's paragraph on speech grew by ~78 bytes when
 * the blanket "we won't moderate anything in private projects" became the true
 * statement — a private project is unmoderated, and putting it in a gallery
 * makes that gallery's curators responsible for it and its chat. It lives in
 * `en-US.json`, which every entry here carries, and `Page` is simply the one
 * with less than that much slack.
 *
 * Chat translation (#1214) moves every entry by the same 0.005MB and adds no
 * file. It is text again, and all of it in `en-US.json`: fourteen strings for
 * the two language pickers, the progress and failure messages, and the line
 * that says when the browser did the translating on the reader's own device,
 * plus a paragraph on the rights page saying what is sent where and what is
 * kept. Every entry moving by an identical amount is the tell that it is one
 * shared file rather than a subgraph — the feature's own modules
 * (`getLocalTranslator`, `chooseTranslator`, the language mapping) hang off
 * `ChatView`, which none of these five reaches.
 *
 * Remembering which language a reader reads chats in is **+1 file** on the four
 * entries that reach `SettingsDatabase`, and none on the layout, which doesn't.
 * `ChatLanguageSetting.ts` is one small file importing only `Setting` — the
 * same shape as the camera and microphone settings beside it, and the case this
 * file's rule above allows a file budget to move by one for. Not a subgraph: it
 * is what keeps a reload from looking as though the translations had been
 * thrown away, when only the choice had.
 *
 * Redesigning the collaborate tile around a table of people is text again, and
 * on balance nearly a wash: twelve locale keys out (five role paragraphs, four
 * plural role labels, two tour steps, a gallery explanation, and the "start a
 * chat" button, which went when a chat became something you make by talking)
 * against fourteen in (the privilege words, the table's own labels, two
 * announcements, a tour step, the first-use prompt, and the row naming who can
 * see the chat). `Page.svelte` is the one entry with no slack left for the few
 * hundred bytes of difference, so only its byte budget moves; the components
 * themselves hang off `CollaborateView`, which none of these five reaches.
 *
 * Floating a field's validation message is **+1 file** on every entry:
 * `validationMessage.ts`, the placement both text widgets share. It is a pure
 * function with no imports of its own — the case this file's rule above allows
 * a file budget to move by one for — and it is in all five graphs because
 * `TextField` and `TextBox` are. It buys a message that nothing can clip,
 * paint over, or mis-position — it goes in the top layer, which is the only
 * place immune to all three, since a field's ancestors routinely carry a
 * `z-index` or a `transform` and either one traps a merely-fixed element. One
 * place decides where a message goes, rather than two that drift.
 *
 * Pointing the tutorial at the interface tours (#984) is **+3 files** and
 * +0.01MB on every entry, and all three files are the leaf case this file's
 * rule allows: `tours.ts`, which names each tour and has no runtime imports at
 * all so that `ConceptLink` can validate a `@Tour/<id>` reference without the
 * parser reaching into components; `ToursSetting.ts`, one more settings leaf
 * reached through `SettingsDatabase` exactly like the folder settings above;
 * and `TourLink.svelte`, which renders such a reference as the control that
 * starts the tour. They are in all five graphs because every page reaches
 * markup, and markup reaches `ConceptLinkUI`.
 *
 * What the tours *say* is deliberately not here: the step lists live in
 * `tourSteps.ts`, which only the project view imports. Keeping them with the
 * names would have been tidier and would have moved seven more kilobytes of
 * explanation into four pages that cannot run a tour — the leak this file
 * exists to catch, just a small one. The bytes that do move are the three
 * files plus the tours' two new glossary terms and the tutorial's skip and
 * wait strings in en-US.json, which every page carries.
 *
 * Remembering which chat threads a creator has read (#821) is **+1 file** on
 * every entry, and it is the settings-leaf case again: `ChatThreadsSetting.ts`
 * imports only `Setting`, exactly like `ChatLanguageSetting` and `ToursSetting`
 * above, and is reached through `SettingsDatabase`. Having read a thread is
 * true of the person rather than the device, so it has to ride in the creator's
 * settings for the "new replies" marker to mean anything on a second device.
 * The reply, reaction, and code-reference *views* are not here and must not
 * become so: they hang off `ChatView`, which none of these five reaches, and
 * the two modules behind them (`chats/threads.ts`, `chat/chatAnnounce.ts`) are
 * imported only from there.
 *
 * The bytes those two features move are text again, and text every page
 * carries: the thread, reaction, and code-reference strings in en-US.json,
 * plus the template-input declarations generated from them. That is +0.01MB
 * on three of the five, and +0.02 on the layout and `Page.svelte`, which had
 * the least slack.
 *
 * **The byte caps carry deliberate headroom, and did not used to.** They were
 * last set to the then-exact reach of each entry, which sounds strict and is
 * really a trap: what this test exists to catch is a new *dependency* — an
 * import that drags the evaluator or colorjs.io onto a page that has no use for
 * it, worth tenths of a megabyte — and a cap with no slack instead fails on a
 * paragraph of explanation added to a shared widget. That happened twice in one
 * change: a comment in `Contexts.ts` and then comments in `TextField` and
 * `CreatorView`, all of them files every page reaches by design. So each cap is
 * now the next round number above its entry, leaving a few kilobytes of room
 * for prose while staying far below what a real leak costs. The file counts are
 * unchanged and stay exact, since those *do* move one at a time and are the
 * sharper signal.
 */
test.each([
    ['src/routes/+layout.svelte', 502, 3.66],
    ['src/components/app/Page.svelte', 525, 3.91],
    ['src/routes/[[locale]]/+page.svelte', 540, 4.0],
    ['src/routes/[[locale]]/galleries/+page.svelte', 544, 4.01],
    ['src/routes/[[locale]]/projects/+page.svelte', 551, 4.03],
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
