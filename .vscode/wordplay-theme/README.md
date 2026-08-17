# Wordplay VS Code theme

The app's own palette, as a VS Code theme, so this repo's window is
recognizable among a dozen others.

**The theme files in `themes/` are generated, never hand-edited.** They are
derived from [`src/app.html`](../../src/app.html)'s palette and the editor's
token colors in
[`TokenView.svelte`](../../src/components/editor/tokens/TokenView.svelte) by
[`scripts/vscode-theme/`](../../scripts/vscode-theme/). After a palette edit,
run `npm run vscode-theme`; `vscodeThemeSync.test.ts` fails in `npm test` if
the committed files are stale.

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

The chrome uses the two colors that read at a glance across a screen full of
windows:

| Surface | Color | App meaning |
| --- | --- | --- |
| Title bar, cursor, badges, accent borders | gold | `--color-gold-text` |
| Status bar | purple | `--wordplay-doc-color` |
| Sidebar, activity bar, tabs | very light grey | `--wordplay-alternating-color` |
| Selection, hover, find matches | yellow | `--wordplay-highlight-color` |

The identity accent is gold rather than one of the semantic hues on purpose:
pink and purple already mean evaluation and docs in the app, and blue means
literals and focus rings, so an identity accent in any of those reads as a
status it isn't. It's the AA *text* variant rather than the brighter
`--color-yellow`, because a saturated frame around every pane is what it
replaced. Pink survives only where it carries meaning — invalid syntax,
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
