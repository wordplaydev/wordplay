# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run check:now     # TypeScript + Svelte type checking

# Building
npm run build         # Full production build

# Testing
npm test              # Run Vitest unit tests
npm run end2end       # Playwright e2e tests (requires Firebase emulator)

# Localization
npm run locales       # Verify locale files
npm run locales-fix   # Auto-fix locale issues
npm run locales-translate # Auto-translate unwritten strings
npm run create-schemas # Derive schema for locale files from TypeScript
```

## Architecture

Wordplay is a web-based programming language IDE where creators write code that produces interactive, animated typography. It is built with Svelte 5 + SvelteKit 2, TypeScript (strict, no `any`), Firebase, and Vite.

### Core pipeline

Text input → **Parser** ([src/parser/](src/parser/)) → AST nodes ([src/nodes/](src/nodes/)) → **Compiler** (`Expression.compile()`) → `Step[]` → **Evaluator** ([src/runtime/Evaluator.ts](src/runtime/Evaluator.ts)) → `Value` → **Output renderer** ([src/components/output/](src/components/output/))

1. **Tokenizer** (`Tokenizer.ts`) segments text into `Token` nodes.
2. **Parser** (`parseProgram.ts`) builds an AST of ~170+ node types rooted at `Source`.
3. **AST nodes** ([src/nodes/](src/nodes/)) are **immutable** — all fields `readonly`. Nodes do not know their parent; `Root.ts` manages parent relationships. Nodes serve as the center of everything: structure, behavior, type checking, conflict detection, and localized descriptions.
4. **Type checking**: `Expression.computeType()` infers or checks types. `Context.ts` caches analysis state and prevents cycles.
5. **Conflict detection**: `Node.computeConflicts()` finds ~50+ error types ([src/conflicts/](src/conflicts/)). `Project.analyze()` runs analysis at the project level, spanning multiple `Source` files.
6. **Compilation**: `Expression.compile()` converts each expression into a flat list of `Step`s ([src/runtime/Step.ts](src/runtime/Step.ts)).
7. **Evaluation**: `Evaluator.ts` runs the `Step` sequence, maintaining a call stack and value stack. `StreamValue`s ([src/values/](src/values/)) trigger reevaluation on each new input event.
8. **Output**: `Stage`, `Phrase`, and `Group` structure values are rendered by Svelte components in [src/components/output/](src/components/output/).

### Key architectural files

| File                                                                                   | Purpose                                                          |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [src/nodes/Node.ts](src/nodes/Node.ts)                                                 | Base class for all AST nodes; grammar, children, lexical scope   |
| [src/nodes/Expression.ts](src/nodes/Expression.ts)                                     | Adds `computeType()`, `compile()`, evaluation descriptions       |
| [src/runtime/Evaluator.ts](src/runtime/Evaluator.ts)                                   | Runs compiled steps; manages call stack, streams, reevaluation   |
| [src/db/projects/Project.ts](src/db/projects/Project.ts)                               | A named collection of `Source` files; entry point for analysis   |
| [src/db/Database.ts](src/db/Database.ts)                                               | All persistence (Firebase + localStorage); exposes Svelte stores |
| [src/runtime/createDefaultShares.ts](src/runtime/createDefaultShares.ts)               | Registers built-in APIs (output types, streams, basis functions) |
| [src/components/project/ProjectView.svelte](src/components/project/ProjectView.svelte) | Top-level window manager and global context store                |

### Localization

All user-visible strings live in locale JSON files ([static/locales/](static/locales/), 26 languages) validated against a schema. `Database` exposes the active locale as a Svelte store. Nodes, conflicts, values, and APIs all define localized descriptions via `Locale.ts`. Run `npm run locales` to verify and `npm run locales-fix` to repair issues, and `npm run locales-translae` to generate translations.

When several UI locales are chosen, all UI text is echoed in each chosen locale (primary full size, the rest dimmed and successively 80% the size). This is centralized in `Locales` (`getSecondaryLocaleViews`, `getMultilingualEntries`, `getMultilingualMarkup`, `getMultilingualFrom`, and the multilingual `getPlainText`/`getUnannotatedText`) and consumed by `LocalizedText` (inline), `MarkupHTMLView` (block), `Hint` (rich markup tooltips), and `TutorialView` (dialog lines). It's a no-op with one locale chosen, and suppressed in localization mode. **Render visible text via `LocalizedText`/`MarkupHTMLView`, not `getPlainText`/`getUnannotatedText`** — those join all locales into one string for attributes (aria-label/title) only. Use `getUnannotatedPrimaryText` when a plain-text result is an identity/key rather than displayed.

**Locale type declarations** ([src/locale/\*.ts](src/locale/), e.g. `UITexts.ts`, `NodeTexts.ts`, `OutputTexts.ts`) describe the shape of every locale JSON file. **Every field whose value is a user-visible string MUST have a TSDoc comment containing exactly one formatting tag**, which tells the in-app localization editor which editor to render:

| Tag           | Editor           | Use when the value is...                                       |
| ------------- | ---------------- | -------------------------------------------------------------- |
| `[plain]`     | plain-text field | a simple label, tooltip, or ARIA description                   |
| `[formatted]` | Wordplay markup  | rich text rendered as `Markup` (use the `FormattedText` alias) |
| `[name]`      | name validator   | a valid Wordplay identifier or list of names (use `NameText`)  |
| `[emotion]`   | emotion picker   | an emotion identifier                                          |

The tag goes in the comment (e.g. `/** [plain] Tooltip for the X button */`); the TypeScript alias should match (`FormattedText` for `[formatted]`, `NameText` for `[name]`, plain `string` for `[plain]`/`[emotion]`). Fields without a recognized tag are filtered out of the editor and invisible to translators, so **every new localization key needs both a comment and a tag**. The matching logic lives in [src/components/localization/Localizer.svelte](src/components/localization/Localizer.svelte) (`getEditorType`).

The tags also determine how the locale tooling treats **string arrays** ([src/util/verify-locales/classifyLocalePath.ts](src/util/verify-locales/classifyLocalePath.ts)): `[plain]` arrays are positional tuples (e.g. `ModeText.labels`) whose length must match en-US, while `[formatted]` and `[name]` arrays (paragraph lists and name aliases) may vary in length per locale (`input.Key.keys.*` synonym lists are special-cased as name-like despite their `[plain]` tag). A `[formatted]` array element must never contain a blank line (`\n\n`) outside `\…\` example code — paragraph breaks are the element boundaries — and its write-status annotation (`$?`/`$!`/`$~`) goes on the **first element only**, since the array is one document and the runtime (`Locales.get`) only inspects the first element. `npm run locales` checks these invariants and `npm run locales-fix` repairs them.

**Template inputs are always named, never numbered.** When a locale string takes runtime values, type it as `Template<['name1', 'name2', ...]>`, write `"$name"` in the JSON, and substitute via `$locales.concretize((l) => l.path, { name: value }).toText()`. Never write `$1`/`$2` or call `.replace('$1', value)` on a template string. Numbered placeholders bypass the locale verifier's typed-key check, get clobbered by auto-translators (they don't survive `npm run locales-translate`), and are illegible to translators reviewing the JSON.

**After every edit to a locale or tutorial JSON file** (anything under [static/locales/](static/locales/) — including the per-locale `*-tutorial.json` and `*-emojis.json` files — or [src/locale/en-US.json](src/locale/en-US.json)), run prettier on the changed files:

```bash
npx prettier --write '<changed files>'
```

Translation tools (e.g. `npm run locales-translate`) and direct script edits often produce inconsistent indentation, trailing newlines, or escape styles that diverge from the rest of the codebase. Running prettier keeps diffs clean and avoids spurious churn on later edits.

### Immutability convention

Immutable data structures and pure functions are the norm everywhere except: Svelte components (internal state + global context), `Evaluator` (stack-based evaluation state), and `Database` (persistence). Most bugs will be in those three areas.

### Screen-reader announcements

All dynamic announcements to screen readers must go through the centralized [Announcer.svelte](src/components/project/Announcer.svelte). The Announcer owns the single `aria-live` region for the app, queues messages, and paces them by reading time so consecutive updates don't trample each other. Do **not** add component-local `aria-live` divs — they conflict with the centralized region and cause cross-talk on real screen readers.

To announce from any component:

```ts
import { getAnnouncer } from '@components/project/Contexts';
// ...
const announce = getAnnouncer();
// In an event handler or `$effect`:
if (announce && $announce) {
    $announce('your-kind-id', $locales.getLanguages()[0], message);
}
```

`aria-label` on a focused element is still appropriate for _focus-time_ labeling — screen readers read the label when the element receives focus. Use Announcer for _change-time_ announcements (the user moved a slider, picked a color, toggled a setting).

### Svelte MCP server

The project configures the official Svelte MCP server ([.mcp.json](.mcp.json), mirrored in [.vscode/mcp.json](.vscode/mcp.json)) for current Svelte 5 / SvelteKit 2 docs and a `svelte-autofixer`. Its suggestions are **advisory**: they encode generic Svelte best practice and are blind to this repo's conventions (immutability outside `Evaluator`/`Database`, the centralized `Announcer` over local `aria-live`, `LocalizedText`/`MarkupHTMLView` for user-visible text). When they conflict, repo conventions win, and `npm run check:now` + `npm test` remain the source of truth — the autofixer never replaces them.

### Keep ARCHITECTURE.md in sync

[ARCHITECTURE.md](ARCHITECTURE.md) is the high-level orientation document for the codebase. After any change that affects content described there — renaming/moving a file it references, changing the responsibilities of a component it describes, adding or removing a major subsystem, or altering the core pipeline — update ARCHITECTURE.md in the same change. If a fact in this CLAUDE.md (e.g., file paths, locale count, node count) also appears in ARCHITECTURE.md, update both.

### Keep LANGUAGE.md in sync

[LANGUAGE.md](LANGUAGE.md) is the Wordplay programming language specification: lexical grammar, syntactic grammar, evaluation semantics, types, and conflicts. After any change that affects the language — adding/removing a token or symbol, adding/removing a node type or grammar production, changing parsing rules, adding/removing a built-in stream, output type, or conversion, altering evaluation semantics for an expression, or changing how a conflict is detected — update LANGUAGE.md in the same change. Touch only the sections affected; do not rewrite untouched sections.

### Behavior

1. Don’t assume. Don’t hide confusion. Surface tradeoffs.
2. Minimum code that solves the problem. Nothing speculative.
3. Touch only what you must. Clean up only your own mess.
4. Define success criteria. Loop until verified.
5. After every code change, run `npm run check:now` and `npm test`. Both must pass before declaring a change done — IDE-reported diagnostics are not a substitute for a clean full type-check, and unit tests catch regressions in branches that hand-testing misses (especially environment-sensitive code like UA sniffing, where JSDOM and the locale verifier's tsx runtime differ from the browser).
6. Always resolve all TypeScript errors, and never use `as`.
7. When you finish a user-visible change (anything touching `src/components/**`, `src/routes/**`, `src/output/**`, or a new built-in feature/dialog/output type), ask the user once at the end: "Want me to draft a CHANGELOG entry via `/changelog`?" Skip the prompt for refactors, test-only edits, doc-only edits, comment edits, and dependency bumps. Never invoke `/changelog` without the user's confirmation.

### Comments

When writing comments, focus on rationale for a behavior, but keep it to 1-2 sentences.
