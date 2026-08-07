Welcome! You must be here to make programming accessible to everyone in the world, regardless of language or ability. We're excited to have your help!

Learn how to contribute on our [project wiki](https://github.com/wordplaydev/wordplay/wiki).

## Working on translations

The locale files — `static/locales/**` and `src/locale/en-US.json` — need a few habits the rest of the codebase doesn't. They're large, they change constantly, and they're machine-retranslated in bulk, so a branch that sits for a couple of months will conflict on nearly every string it touches. These four things prevent most of that pain.

**Install the recommended extensions before you edit a locale file.** VS Code offers them when you first open the project; accept. Formatting on save is on, and without the Prettier extension VS Code formats JSON with its own built-in formatter, which expands every inline array. One save rewrites about 10,000 lines of a locale file, and from then on your branch conflicts with every change anyone else makes to it.

**Merge, don't rebase, when your branch touches locale files.** The wiki recommends rebasing, which is right for ordinary code. For these files, `git merge main` is better: you stop once instead of once per commit, and — importantly — `HEAD` in the conflict is _your_ work. During a rebase the sides are swapped, so VS Code labels the project's content "Current" and your own commit "Incoming", which reads backwards from what you'd expect.

**Remove the `$~` prefix when you improve a machine translation.** That prefix marks a string as machine-translated, and the translation tooling rewrites every string still carrying it. Editing the text but leaving the `$~` in place means your wording gets replaced the next time translations are refreshed. (`$?` means unwritten and `$!` means the English was revised and the translation needs another look; both are fine to leave alone.)

**Sync often.** `git merge main` weekly costs far less than one big merge at the end.

When you do get a conflict, you'll see three sections rather than two, because `npm install` configures `merge.conflictstyle=zdiff3` for this repository. The middle section is the common ancestor — the string as it was before either of you touched it. Comparing your version against it usually makes clear whether the project rewrote the same string you did, or whether only a neighbouring line changed and your own edit is safe to keep.
