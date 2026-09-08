---
name: changelog
description: Draft a CHANGELOG.md entry for the current change — pick a representative emoji, write the text in 6th-grade plain language, link any mentioned public routes to wordplay.dev, and cite the relevant issue/PR. Invoke via /changelog after finishing a user-visible change.
---

# /changelog

Draft a CHANGELOG entry for the current change in this repo.

**Every bullet in every section gets an emoji prefix.** Visual consistency across Added/Changed/Fixed/Removed is the whole point. Skip the screenshot route entirely — production URL links (below) are easier to maintain and give readers a one-click path to see the change in action.

The line must start with **a single representative emoji + space** — the parser in [scripts/updates.ts](../../../scripts/updates.ts) reads this prefix and the in-app updates page renders it as an inset marker beside the text.

**Every entry is machine translated into 29 languages.** That is what makes the two rules below — one sentence, and only what a creator can see — worth following rather than merely tidy. An entry is bought once and never re-bought, so the cost of a run is the cost of what is new in it.

## When to invoke

- User typed `/changelog`.
- User asked you to update the changelog.
- You just finished a user-visible change and the user said yes to your offer to draft an entry.

**Do not run unprompted.** Always confirm with the user before writing to `CHANGELOG.md`.

## Workflow

### 1. Understand the change

```bash
git status
git diff
git log -5 --oneline
```

Group related diffs into **one** bullet per user-visible behavior — not one bullet per file. If there are several unrelated changes, draft separate bullets.

### 2. Pick a section

| Heuristic                                           | Section    |
| --------------------------------------------------- | ---------- |
| New feature, dialog, output type, or built-in       | Added      |
| Reworked behavior or visual change to an existing feature | Changed |
| Bug fix to existing behavior                        | Fixed      |
| Feature/UI/file removed                             | Removed    |
| Anything a creator can't see (below)               | **skip — no entry** |

**The test for the last row is "could a teacher or a student notice this without reading the code?"** If no, there is no entry. That excludes test-only and comment-only changes, dependency bumps, doc cleanups, refactors, internal architecture, build and CI work, performance work with no perceptible difference, and accessibility plumbing that changes no behavior. Write about the change a reader experiences, not the work that produced it — "we rewrote how the editor tracks the cursor" is the work; "the cursor no longer jumps to the wrong line" is the change.

When uncertain, ask the user.

### 3. Pick an emoji

| Category                         | Emoji  |
| -------------------------------- | ------ |
| Localization / new language      | 🌐     |
| Glyph / font / typography        | 🔣 🔠   |
| Build / tooling / infrastructure | 🛠️     |
| Audio / sound                    | 🔊     |
| Animation / motion               | 🎞️     |
| Physics                          | 🧲     |
| Layout primitives                | 🧱 📐   |
| Security / permissions           | 🔒 🔑   |
| Documentation / how-to           | 📖     |
| Conflict / type-checking         | 🚦     |
| Persistence / sync               | 💾     |
| Performance                      | ⚡     |
| Editor / text input              | ✍️ 📝   |
| Autocomplete / menu suggestions  | 💡     |
| Mouse / pointer / scroll         | 🖱️     |
| Copy / paste                     | 📋     |
| Visual / contrast / dark mode    | 🎨 🌙   |
| Blocks editing                   | 🧩     |
| Tour / navigation aid            | 🧭     |
| Sharing / gallery collaboration  | 🤝     |
| Generic bug fix (no category)    | 🐛     |
| Removal / cleanup                | 🧹     |

Deviate when something else fits better. The emoji prefix must be a single extended-pictographic grapheme (including VS16 modifier sequences like `🛠️`) followed by a space, or the parser won't detect it.

### 4. Write the text

The sentence after the emoji is read by teachers and youth (per the file's preamble):

1. **Reading level: 6th grade.** Short words, concrete verbs, no jargon. Wordplay identifiers like `@Phrase`, `Bind`, `@Hand` stay as-is because they're language constructs — but don't surround them with engineering vocabulary ("subsystem", "memoization", "race condition", "regression").
2. **Length: one sentence.** Add a second only when the first would be untrue or unusable without it, and say so when you show the user the draft. Most bullets that want two sentences are either two bullets or one sentence carrying an explanation the reader didn't ask for. This is a real budget rather than a style preference: the sentence is translated into 29 languages, so every clause is paid for 29 times, and entries currently average 1.68 sentences.
3. **Voice: first person plural** ("We added…", "We made…", "We fixed…"). Match the existing style.
4. **Cite the source.** If a GitHub issue or PR motivated the change, append `(#1234)` at the end of the sentence — the page renders these as clickable GitHub links. To find one: check recent commit messages (`git log --oneline -20`) for `(#N)` references, or `gh pr list --state merged --search '<keyword>'` for recent PRs. Cite at most two numbers per bullet. Skip the citation only if no related issue/PR exists.

Bad: "Refactored the autocomplete subsystem to defer suggestion materialization, eliminating UI thread blocking during keystroke input."

Good: "We made auto-complete during typing less aggressive and annoying. (#1058)"

### 5. Link mentioned public routes to production

Production lives at `https://wordplay.dev`. When the entry text mentions a feature that maps cleanly to a **public route** (no auth, no project state), wrap the relevant phrase in a markdown link so readers can jump straight to it. The page renderer converts `[text](url)` into Wordplay markup `<text@url>` automatically.

**Public routes to link to** (verified non-auth):

| Phrase in entry                  | Route URL                                      |
| -------------------------------- | ---------------------------------------------- |
| "Guide" / programming guide      | https://wordplay.dev/guide                     |
| "Learn" / learn page             | https://wordplay.dev/learn                     |
| "Projects" / projects list       | https://wordplay.dev/projects                  |
| "Galleries" / galleries list     | https://wordplay.dev/galleries                 |
| "Characters" / characters page   | https://wordplay.dev/characters                |
| "Teach" / teacher resources      | https://wordplay.dev/teach                     |
| "About" page                     | https://wordplay.dev/about                     |
| "Thanks" / thank you page        | https://wordplay.dev/thanks                    |
| "Rights" / rights page           | https://wordplay.dev/rights                    |
| "Design" page                    | https://wordplay.dev/design                    |
| "Donate" page                    | https://wordplay.dev/donate                    |
| "Updates" page                   | https://wordplay.dev/updates                   |
| Landing / language chooser dialog | https://wordplay.dev/                          |

**Skip linking** when:

- The feature lives inside the editor (`/project/...`), gallery editor, or any auth-gated state — readers can't navigate there from a cold link.
- The mention is too generic to anchor to a single route ("on long pages", "in the editor", "in dialogs").
- The phrase doesn't read naturally as a link.

Examples:

- ✅ `📖 Added 11 new built-in how-to's to the [Guide](https://wordplay.dev/guide)...`
- ✅ `🙏 We added a [thank you page](https://wordplay.dev/thanks) showing all of our GitHub contributors...`
- ❌ `🎨 We fixed a [text selection](https://wordplay.dev/) bug in the editor.` (editor isn't a single public URL)
- ❌ `⬆️ We added a [back to top](https://wordplay.dev/guide) button on long pages.` (too generic — picking one example URL is arbitrary)

At most one link per bullet — multiple links inside a single sentence read as link soup.

### 6. Insert into CHANGELOG.md

- Open [CHANGELOG.md](../../../CHANGELOG.md).
- Find the **top** `## <version> - <date>` section. If a new version section is appropriate (e.g., a release just happened), ask the user before creating one — version bumps belong to the release process, not the skill.
- Place the bullet under the right `### Added | Changed | Fixed | Removed` subsection.

### 7. Regenerate the in-app JSON

```bash
npm run updates
```

This rewrites `static/updates.json` from the changelog: the release structure, each entry's text converted to Wordplay markup, and a stable id per entry. The page fetches it, so the new entry appears on reload.

The id is a hash of the entry's Markdown, and each locale's translations are keyed by it (`static/locales/<code>/<code>-updates.json`). Two consequences worth knowing:

- A new entry is untranslated until the next `npm run locales-translate` run, and falls back to English until then. That is expected; nothing needs doing.
- **Editing a published entry buys 29 new translations**, because the edit changes its id and the old translation becomes an orphan. Fix a wrong or broken entry freely — that is what the budget is for — but don't reword one for style alone.

### 8. Verify

Per [CLAUDE.md](../../../CLAUDE.md) guidance:

```bash
npm run check:now
npm run test:run
```

(`npm test` is vitest in watch mode and never exits — see CLAUDE.md rule 5.)

Both must pass. Show the user:

- The new bullet text (rendered, including any link target).
- Files modified (CHANGELOG.md; `static/updates.json` is generated and gitignored).

**Do not commit.** Leave the working tree dirty for the user to review.

## Notes

- Paths in markdown link syntax are passed through to Wordplay markup unchanged — be conservative with the URLs you generate. Stick to `https://wordplay.dev/<route>` from the table above unless the user provides a specific URL.
- Emoji prefix must be a single extended-pictographic grapheme (including VS16 / ZWJ sequences) followed by a space. The parser will not detect it otherwise.
- Plain bullets (no emoji prefix) still parse correctly, but should not be written by this skill — visual consistency across the page is the whole point. Older legacy entries (pre-0.17.7) remain plain.
