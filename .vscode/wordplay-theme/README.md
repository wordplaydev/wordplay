# Wordplay VS Code extension

The app's own palette, as a VS Code theme, so this repo's window is
recognizable among a dozen others — plus syntax highlighting for `.wp` files,
so a Wordplay program reads the way it does in the app.

**Everything here is generated, never hand-edited.** The themes in `themes/`
are derived from [`src/app.html`](../../src/app.html)'s palette and the
editor's token colors in
[`TokenView.svelte`](../../src/components/editor/tokens/TokenView.svelte). The
grammar in `syntaxes/` and `language-configuration.json` are derived from the
app's own tokenizer and token categories. All four come from
[`scripts/vscode-theme/`](../../scripts/vscode-theme/); after a palette or
tokenizer edit, run `npm run vscode-theme`. `vscodeThemeSync.test.ts` and
`vscodeGrammarSync.test.ts` fail in `npm test` if the committed files are
stale.

## Installing

VS Code only loads extensions from its own extensions folder, so link this one
into it, from the repo root:

```bash
ln -sfn "$PWD/.vscode/wordplay-theme" ~/.vscode/extensions/wordplay-theme
```

Then reload the window (`Developer: Reload Window`). The symlink means
regenerating the theme takes effect without reinstalling.

Use `-sfn`, not a bare `-s`: if the link already exists, plain `ln -s` follows
it and creates a self-referential `wordplay-theme` *inside* this folder rather
than replacing the link. `-sfn` is idempotent, so re-running it is safe.

Installing makes the theme *available* in every window. Applying it is
separate, and is what the next section is about.

## Using it only in this repo

`workbench.colorTheme` is window-scoped, so it can be set per workspace. Add
this to `.vscode/settings.json` and other VS Code windows keep whatever theme
you use everywhere else:

```json
"workbench.colorTheme": "Wordplay Dark"
```

That file is committed, though, so setting it there also changes the theme for
every other contributor who opens the repo — including anyone who hasn't
installed the extension, who would get a "theme not found" notice.

To keep it to yourself, use a **profile** instead, which needs no repo change
at all. `Profiles: Create Profile` (from the Default profile, so your
extensions carry over), name it Wordplay, set the theme inside it, and VS Code
remembers the profile for this folder and reapplies it every time you open the
repo. Profiles live in your own VS Code config, so nothing about this is
shared.

One caveat if you ever turn on `window.autoDetectColorScheme` for automatic
light/dark switching: the settings that then drive the theme are
`workbench.preferredDarkColorTheme` and `workbench.preferredLightColorTheme`,
which are *application*-scoped and cannot be set per workspace. Profiles are
the only per-folder option in that case.

## What the colors mean

The chrome is laid out the way the app's project view is: every pane is the
same surface, and the only thing between them is a hairline.

| Surface | Color | App meaning |
| --- | --- | --- |
| Every pane — editor, sidebar, activity bar, tabs, panel, terminal, title bar, status bar | white in light mode, black in dark | `--wordplay-background` |
| Every seam between them | grey hairline | `--wordplay-border-color` |
| Menus, hovers, suggestions — things that float *above* a pane | very light grey | `--wordplay-alternating-color` |
| Cursor, badges, active tab rule, active activity-bar marker | gold | `--color-gold-text` |
| Selection, hover, find matches | yellow | `--wordplay-highlight-color` |

So the window's identity is the composition, not a colored bar: an editor that
looks like the app it builds. `ProjectView` separates its tiles with a 1px
`--wordplay-border-color` rule and gives each one `--wordplay-background`, and
that is exactly what every `*.border` and every pane background here is set to.
Nothing is a colored frame — a saturated bar at the top and bottom of the window
is what this replaced.

Gold survives only where the app uses it: on what's currently active, the way a
tile toolbar fills only its active toggle. It's gold rather than one of the
semantic hues on purpose — pink and purple already mean evaluation and docs, and
blue means literals and focus rings, so an accent in any of those reads as a
status it isn't. Color otherwise appears only where it carries meaning: purple
for a remote indicator, orange while debugging, pink for invalid syntax,
unmatched brackets, and Git conflicts.

Accent *borders* — the active tab's top rule, the activity bar's marker, peek
view — are toned further. The palette tunes its colors to be legible as
*text*, which is more contrast than WCAG 1.4.11 asks of a non-text UI part
(3:1) and reads as glaring on a 1px rule, so the generator blends the accent
toward the background until it sits at the palette's text target.

Syntax colors mirror the Wordplay editor's token categories one for one:

| Wordplay category | Color | TypeScript / Svelte equivalent |
| --- | --- | --- |
| `docs` | purple | comments, JSDoc |
| `delimiter` | dark grey | braces, brackets, separators |
| `relation` | orange text | `.`, `:`, type annotations |
| `operator`, `type` | orange text | keywords, operators, types, classes, tags |
| `eval` | blue text | `function`, `=>`, `new` — Wordplay's `ƒ` and `→` |
| `literal` | blue text | strings, numbers, `true`/`null`, regexes |
| `name` | foreground | variables, parameters, function and property names |
| `unknown` | pink | invalid syntax |
| `placeholder` | grey text | deprecated symbols |

Two deliberate departures, both noted in the generator:

- Wordplay colors the `ƒ` marker blue and the function's *name* foreground, so
  `function` and `=>` are blue here while the name they introduce is not.
  Coloring whole call expressions blue would have made function names and
  string literals indistinguishable.
- Doc comments are italic. The app shrinks doc tokens to `0.85em` instead, but
  VS Code has no per-scope font size.

The palette is colorblind-safe and contains no green, so the theme leaves
terminal ANSI colors to VS Code's defaults rather than inventing one, and Git's
"added" decoration borrows the gold link color. Every text color on a brand
fill is picked by the same rule the app uses for `--wordplay-error-text-color`
and checked against WCAG 2.2 AA at generation time — the generator throws
rather than emitting an illegible pair.

## Highlighting `.wp` files

Opening a `.wp` file gets Wordplay highlighting automatically. The grammar
gives every token a standard TextMate scope, so the file is colored sensibly
under any theme; under this one, the scopes resolve to the same colors the
app's own editor uses. `Ctrl+/` toggles elision (`*…*`), Wordplay's comment.

Wordplay suits a static grammar unusually well, because nearly every construct
is a single glyph and the tokenizer is a context stack — code, text, markup,
and pattern — that maps onto TextMate's begin/end rule recursion. Each rule's
pattern and its position in the rule order come from the tokenizer's own
serialized rule lists, and each scope is chosen so its Wordplay token category
matches the color this theme gives that scope; the sync test checks both.

**Only the canonical glyphs are colored.** Localized keyword *words* are not,
by design: which words lex as keywords depends on a project's declared locales,
which a static grammar can't read, and a locale's short keyword words (Spanish
`y`, `o`, `no`) would color ordinary variable names in every other project.
Since copy and paste rewrites words back to symbols, most files are unaffected.

### What the grammar can't do

1. **The container preamble isn't special-cased.** `=== name/lang` source
   headers are highlighted as headings, but the optional preview-glyph line and
   the project-name line are highlighted as ordinary code. TextMate matches line
   by line with no document position, so "line 1" isn't expressible, and any
   shape heuristic would also fire on real code lines.
2. **No bracket-depth coloring.** The app cycles colors by nesting depth
   (`TokenView.svelte`'s `.bracket-depth-*`); a static grammar has no depth. VS
   Code's own bracket pair colorization is a partial substitute.
3. **No semantic or type-aware coloring.** The app knows a name is a function, a
   structure, or an unresolved reference; the grammar knows only that it is a
   name. Nothing turns pink from a *conflict* — only from a lexically
   unrecognizable character.
4. **Recovery from unclosed delimiters differs.** An unclosed text literal ends
   at the newline in both, but an unclosed `¶`, `` ` ``, `⣿`, or `*` runs to the
   end of the file here, whereas the real tokenizer pops contexts in ways
   TextMate's rule stack can't express.
5. **Markup branch and link gating is approximate.** The tokenizer tracks
   "is a mention open?" and "is a tag open?" as state; the grammar uses a
   one-character lookbehind and a same-line forward assertion, so a `[a|b]`
   branch or a `<…@…>` tag split across lines isn't recognized.
6. **Stray closing quotes don't open text.** The tokenizer lets `”`, `’`, `»`,
   or `」` open a text literal; the grammar recognizes only the nine canonical
   openers, since treating a stray close as an opener produces long runs of
   wrongly-stringed code.

Two scopes deliberately disagree with the app's token categories, because they
follow what the app *renders* rather than what the category table says: a
`/en` language tag is `delimiter` by category but is painted with the type
color by a CSS override, and a bare URL in markup is drawn as a link, since a
link that doesn't look like one is worse than a color mismatch.

### Checking a change to the grammar

The sync test verifies the Sym-to-scope mapping, not the regexes. After
changing the grammar, open a few `.wp` files and put the caret on individual
glyphs with `Developer: Inspect Editor Tokens and Scopes`, which shows both the
scope and the theme rule that colored it. Worth checking:
[`Patterns.wp`](../../static/examples/Patterns.wp) (a `⣿…⣿` pattern, and the
`\…\` example inside a doc, which should *not* be doc-purple),
[`Chamber.wp`](../../static/examples/Chamber.wp) (`"glyph\number\"`
interpolation), [`Adventure.wp`](../../static/examples/Adventure.wp)
(`` `*\here.ending\*` ``, which is a formatted literal and so string-blue, not
purple), and any file in
[`static/examples/zh-CN/`](../../static/examples/zh-CN/). Then switch to a stock
theme and reopen one, which is the other half of the scope design.
