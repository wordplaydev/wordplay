# Change Log

We'll note all notable changes in this file, including bug fixes, enhancements, and all closed issues.
Dates are in `YYYY-MM-DD` format and versions are in [semantic versioning](http://semver.org/) format.
These notes are publicly posted in [production](https://wordplay.dev/updates), so we write them to an audience of teachers and youth.

## 0.26.2

### Added

- 👁️ We added sensor preview panels to monitor your camera and microphone in real-time, showing hand and face landmarks as dots, volume levels, and pitch detection as a moving line. This can help when you're debugging things involving the camera and microphone.
- 🐤 We added Flappy, a new example in the [Games gallery](https://wordplay.dev/galleries) to celebrate our new physics engine. Flap a little bird through gaps between stacks of emojis by clicking, pressing keys, or humming — the bird floats up to match the pitch of your hum!

### Changed

- 🧲 We replaced the physics engine that powers `@Motion` and `@Collision` with a faster one, so projects with lots of moving and colliding things run more smoothly, especially on slower computers. Falling, bouncing, and rolling should feel mostly the same as before, though projects that use these might need a bit of tuning.
- 🧶 We changed the Pounce example so the ball bounces away from wherever it lands on the kitty, instead of always flying the way the kitty faces.
- 🔍 Search in the [Guide](https://wordplay.dev/guide) now also looks inside example code and glossary definitions, so you can find a concept by the code in its examples or a term by the words in its meaning.

### Fixed

- 🐛 We fixed a bug where checking a named stream for changes with `∆` (or its history with `←`) could suddenly stop a program with an error after another input changed — which made projects quietly stop responding to clicks and choices.

## 0.26.1 - 2026-07-09

### Added

- 🙂 We added a `@Face` stream that watches your face with the camera. It tells you where your face is, whether your eyes and mouth are open, and if you're smiling, frowning, or raising your eyebrows — plus which way your head is turned. There's a new Face example in the [Galleries](https://wordplay.dev/galleries) to try.
- 🎞️ We added a `changing` input to `@Phrase` that chooses how its text changes: `'edit'` erases and retypes it, `'rewrite'` replaces one letter at a time in a random order, and `'random'` spins each letter like a slot machine until it lands on the new text, using only letters that match your text's language and case (#74).
- 📛 Projects can have multilingual names now.
- 🥾 You can now step through example programs to see how they evaluate.

### Changed

- 🔣 We changed how you write a Unicode character by its number in text and documentation: it's now `@U/1F600` instead of `@1F600`. That way, a name made of letters and numbers always links to the thing it names.
- 🎞️ Text in a `@Phrase` now changes instantly unless you choose a `changing` effect. It used to always type itself out when it had a duration.
- ⚡ We made the code editor much faster on long programs.
- ✍️ We fixed a freeze when you started to drag code in a long program.
- 📋 We trimmed clipboard contents to avoid them from getting too big.
- 🖱️ In text mode, we now allow the selected node to be draggable with the shift key down.
- 📖 On a concept's own documentation page, links to its parts now show just the part's name (like `smiling`) instead of repeating the page's name (like `Expression.smiling`).

### Fixed

- 💡 We fixed suggestions for unfinished inputs like `changing:` — the editor now offers the input's choices instead of nothing, and no longer mixes up which input you're setting.
- ‼ We moved the clipboard and collaboration footer in the editor to its own space, so the cursor can't hide behind it.
- ⌨️ We made vertical caret movement in the blocks editor more predictable.
- 🔗 We fixed link colors in areas with backgrounds the same color as links.
- 🔣 We fixed documentation links whose names look like number codes (like `@Face`), which used to show an empty box instead of linking to the right page.

## 0.26.0 - 2026-07-02

### Added

- 🔣 We added fonts for more than 150 writing systems, from Arabic and Cherokee to Egyptian hieroglyphs. Wordplay downloads each one only when text on your screen needs it, so letters from any language now appear instead of empty boxes.
- 🔠 When you add a character in the editor, you can now search for letters, symbols, and Chinese characters by name or meaning — type "water" to find 水, or "summation" to find ∑ — and point at any character to see its name. Emoji show up first in the results.
- 🕰️ We added `@Moment`, a value for dates and times, and `@Now`, a stream that ticks the current date and time. A Moment turns into text in your language, calendar, and time zone — so `Phrase(Now() → '')` is a live clock that changes language when your locale does (#1197).
- 🌐 Moments work with 16 calendars — like Hebrew, Japanese, Chinese, and Islamic calendars — and any time zone in the world. Dates look the same on every computer, because Wordplay formats them itself instead of asking the browser (#1197).
- 🔗 Web addresses you write in documentation are now clickable links, and they stay intact instead of losing one of their slashes.

### Changed

- ⚡ We made Wordplay start faster, especially the first time you open a project.
- 🔒 When a project is read only, we replaced the lock icon with a checkerboard pattern, so you can tell it's read only without hiding anything. Screen readers now say when a project is read only, too.
- 🚦 You can now see errors and hints in a read-only project. You still can't change the code, so we hide the fix buttons.

### Fixed

- 🔣 We stopped Wordplay from downloading fonts it didn't need. Invisible marks next to emoji were quietly pulling in big fonts — like Chinese and math fonts — that nothing on your screen used.
- 🔠 The character picker no longer shows empty boxes for characters that none of our fonts can draw — it only offers ones you can actually see.
- 🖱️ Links in documentation now open when you click them in the editor. To edit a link instead, move into it with the arrow keys or click right next to it.
- ✍️ We stopped adding an extra `/`, `_`, or `*` when you type one inside plain text. Wordplay now only completes these marks in documentation, where they format words.
- 📖 Symbols like `[`, `|`, `>`, and `@` in documentation are now just text unless they mean something there. Before, writing `[like this]` in docs could make your whole program unreadable to Wordplay.

## 0.25.1 - 2026-06-30

### Added

- 🪲 When you write documentation with example code, you can now mark an example as one that's _meant_ to have a mistake, so Wordplay won't flag it as an error — handy for showing what a mistake looks like.
- 🌐 Numbers now appear in your language's own digits and number style. When a number becomes text or is shown as a value, we use the right digits (like १,२३४), grouping, and decimal mark for your language — and you can ask for a specific one with a tag like `5 → ''/hi-IN` (#1196).

### Fixed

- 🌐 We fixed many example programs in the docs and tutorial that broke when translated into other languages — pieces of them were getting lost or jumbled, so they didn't show up right. Now they translate cleanly and appear the way they should.

## 0.25.0 - 2026-06-27

### Added

- 🌐 When you pick more than one language for Wordplay, we now show the interface in all of them at once. Your first language appears full size, and each other language follows it a little smaller and lighter — in labels, tooltips, the [Guide](https://wordplay.dev/guide), the tutorial, and even error messages.
- 🌐 We added a writing layout setting, so your program's output can read top to bottom (vertical) instead of left to right. It follows your language automatically, or you can pick one (#220).
- 📖 When you look at a concept in the [Guide](https://wordplay.dev/guide), we now show a link to the lesson that teaches it and a list of how-to's that use it, so it's easier to learn more (#769).
- 📖 We added a glossary to the [Guide](https://wordplay.dev/guide) that explains the key words and ideas used across Wordplay. You can search it, or hover any term in the docs to see what it means (#780).
- 📕 Added the first sentence of project documentation to the project previews (#897).
- 📝 When you help translate Wordplay, we now point out text that may be hard to read and suggest when a key word should link to the glossary, so translations stay clear and easy to read (#460).

### Changed

- 🌐 We made Wordplay work much better for right-to-left languages like Arabic and Hebrew. Menus, buttons, text, and the things your programs show on stage now flow from right to left to match how you read.
- 🌐 We now use Claude to translate Wordplay into other languages. The wording is clearer, key words stay consistent, and the small example programs in the docs get translated too, not just the words around them.
- 🌐 We made translating your own project into another language better: names, text, and documentation now translate together, with clearer wording.

### Fixed

- 📕 We re-organized the how-to editing and viewing panels to offer much more width for viewing.
- 🖱️ We fixed the code examples in the [Guide](https://wordplay.dev/guide) so you can drag pieces of them into your project.

## 0.24.0 - 2026-06-20

This abbreviated week we fleshed out the multilingual and text processing part of the programming language.

### Added

- ⌕ We added a major new element to the programming language: patterns! Also known as "regular expressions", these help you test whether some text matches a particular pattern `"@amyjko" ≈ ⣿"@" >0 {_ #}⣿` ("does this text match an at symbol followed by 1 or more letters or numbers?"), and help you search text for particular patterns `"does my mystery string have a secret code 123456abc?" ⌕ ⣿6 # 3 _⣿` (find all sequences of 6 numbers followed by 3 letters) (#121). Matching is fully steppable, so you can single-step a match and watch the position advance and captures fill in, just like the rest of evaluation.
- 📛 We added the ability to both view and use **natural language keywords** in code, in addition to their symbolic counterparts. For example, for conditionals, you can either write `condition ? a b` or `condition then a b`, or in Spanish, `condición entonces a b`. This works for every built-in symbol, in all the languages Wordplay supports, so the same program can appear as symbols or as words in each person's language. You can toggle this in settings, if you prefer shorter symbols or longer words in your language (#1194).
- 🌎 When text is sliced up or combined, we now preserve and combine locales (e.g., `"hello and"/en + "hola"/es` now produces `"hello and hola"/en_es`) (#526).
- 🌍 We added an operation to apply a locale to plain and formatted text (e.g., `("hello" + "world")/en` applies the `/en` locale to the computed text) (#1189).
- 🌏 We added several operations to formatted text to mirror text operations (#1190).
- 🌐 All locale information on plain and formatted text is now reflected in program output, so all text-to-speech functionality is properly localized and language writing directions are respected.
- 🌐 Autocomplete menus now suggest extra languages and regions, in case you want bilingual, trilingual, or radically multlingual text! (#884).
- 💡 We added short notes under each suggestion in the autocomplete menu and under code in the [Guide](https://wordplay.dev/guide), so you can see what a concept does without clicking through. We also rewrote many of the built-in explanations so each one starts by saying what it does (#1036).

### Fixed

- 📕 We made the navigation breadcrumbs on the guide more consistent with the page section selection.

## 0.23.0 - 2026-06-13

This week we improved the editor, fixed a few bugs, and added a new shorter tutorial for learners who already know another programming language.

### Added

- › You can now "fold" multi-line blocks of code to make it easier to navigate larger programs (#806, #883).
- ❓ We added a new quick tutorial for creators who know another common programming language and want a quick way to understand how Wordplay compares. We're starting in English for now until we get feedback on it, then we'll work on translations later (#1034).

### Changed

- 🛠️ We upgraded internal tooling for stability.
- 🎨 We gave tutorial markers colors and numbers to help distinguish them (#1014).

### Fixed

- ¶ We fixed many inconsistencies with the editor cursor in blocks and text mode.
- 💨 We made the editor's drop down menus faster to display, especially big ones and especially in blocks mode.
- 🐜 Debug timeline dragging was broken. It's fixed now!
- 🔦 The little output chooser that appears when there are more than two source files was overlapping notifications. We moved it to avoid overlap.
- 🚨 We made tutorial highlights more reliable (#902).
- 🔢 We fixed a problem with unit types that let some type conflicts slip through.

## 0.22.0 - 2026-06-06

This week we made improvements to the output palette, output editing on stage, and added a block-based editing palette.

### Added

- 🖱️ There's a new block-based editing palette sidebar for quicker dragging and dropping.
- 🖱️ Block-based editing with drag and copy and paste is now much more consistent. And when something can't be dragged or paste, we explain why in a new editor footer message.
- 📋 There's now a visual clipboard to show what's copied (#10).
- 💡 When you write formatted text, auto-complete now suggests your [custom characters](https://wordplay.dev/characters), so you can drop them into your words without typing their names — even to fill an empty spot. (#664)
- 🖼️ We now render custom characters in a regular @TextLiteral, in addition to a @FormattedLiteral.
- 😊 Now you can duplicate characters.
- 🎨 We added many new pre-defined animations and a fancy new palette editor to preview them!
- 🔶 We add support for editing, moving, rotating, and scaling all @Shape output!
- ⚡️ We made it possible to edit all aspects of output in the palette (#172, #173, #174).
- 💨 We made changes to a @Phrase's text animate too, in addition to rotate, scale, color, and other properties.
- ⌨️ We added a setting to change the behavior of the tab key (#758).
- ⌨️ We added "soft" wrapping to the text editing mode, so long lines are easier to read (#1173).

### Changed

- ✏️ We made the editor's double click selection behavior make more sense.
- 🌈 We added alternating colors and different sizes to parentheses and brackets so they're easier to match in text mode (#1170). We also made the screen reader descriptions easier to understand.

### Fixed

- 요 We fixed Korean text entry (#1054).
- 🚦 When nothing is selected, the palette's buttons for adding output now only make changes that fit — like wrapping a @Phrase in a @Group, or a @Form in a @Shape — instead of odd ones like putting a @Shape inside a @Phrase. When your program is empty, we offer to add a @Phrase to get you started.
- ⌨️ Multiple selections on stage only worked by pointer; now keyboards are supported too (#118).

## 0.21.0 - 2026-06-01

This week we made saving much more fast and reliable.

### Added

- 🔄 We added a "syncing with the cloud" list to the save status dialog, so you can check if projects, galleries, characters, how-tos, and chats finish loading — or see if something didn't.
- 🔄 When your browser or device is low on storage, we warn you, and when its out, we give an error. Sign in to save your work!
- 📍 To keep GitHub tidy, we now have a bot that asks inactive assignees on GitHub for an update after 3 weeks of silence, and unassign them if they are silent a week later.

### Changed

- 🔄 We made loading, updating, and saving errors display more consistently and reliably.
- ⚠️ We made it easier to navigate conflicts in the editor when there are many.
- 🎨 You can now edit @Phrase's inputs if they are a @Bind that refers to some other value.
- 🛠️ We upgraded internal tooling for stability.

### Fixed

- 🖱️ We fixed pop-up tips in scrolled dialogs. (#1177)
- 🔄 We made loading and saving much less intensive for slow internet connections and people with lots of projects, galleries, and chats. Saving should be much more reliable overall now, especially if you temporarily lose your internet connection (#812).

## 0.20.0 - 2026-05-30

This week focused on improving many aspects of the Guide, including speed, usability, and bug fixes. We also added a new stream called @Contour that lets you get the shape of a glyph as a list of points, letting you do neat things to celebrate your favorite letters and symbols!

### Added

- 🔣 We added @Contour, a new built-in input stream that traces the outline of letters in a font as a list of @Place values, so you can dot, trace, or animate the shape of any glyph. You can read about it in the [Guide](https://wordplay.dev/guide?concept=Contour). (#1167)
- 🔁 There's a new feature in the programming language called @Translate! It lets you convert the items in a list, set, map, or table into a new list, set, map, or table. Put a collection on the left, the new `↦` arrow in the middle, and what each item should become on the right, using `⬚` to mean the current item. So `[1 2 3] ↦ ⬚ + 1` makes `[2 3 4]`.
- 🔗 We made the guide remember the query and sections you were viewing, in case you need to refresh the page or share a link.
- 🎨 @Color has a function called @Color.random, which lets you pick a random basic color, a random color of a particular lightness and chrome, or a random color between two colors.
- 🎨 @Color now also has @Color.lighter and @Color.darker, which give you a brighter or dimmer version of a color. They change the lightness by 5%, or by any percent you give them, like `Color.blue.lighter(20%)`.
- 🔎 We added a search and replace feature to the code editor.
- 🖱️ Now you can click click click in the editor to expand the selection. (Just like pressing escape, escape, escape does).
- 🔙 We added navigation breadcrumbs to the top of pages, for easier navigation back (#790).

### Changed

- 🔲 We changed the symbol for "this" — the unnamed value inside conversions, reactions, structures, and the new `↦` map — from `.` to `⬚` (a little dotted square). Now you can reach its parts cleanly, like `⬚.x`, instead of the confusing `..x`.
- ⚡️ We made search faster and more forgiving across the platform, including in the guide, tutorial, projects, glyph chooser, and localization mode.
- ▶️ We made how-to previews more useful, showing behavior instead of code. Click into the how-to to see and copy code (#1039).
- 📚 We redesigned navigation in the guide to make it more like a web browser, with a home and back button, a browsing history, and links that become inactive.
- ➕ We made it easier to expand and collapse really big values.
- ⌨️ When pressing up on the first line or down on the last line, you go the beginning and end of the source.
- 🚦 When you divide `÷` or take a remainder `%` by a number that might be zero, Wordplay now warns you and offers to fix it with `??` so you can pick a backup value. Before, dividing by zero could quietly give a broken number or stop your program with a confusing message.
- 🎨 The color picker now has an eyedropper button you can use to grab any color from your screen. It works everywhere you choose a color, not just when drawing characters. (#1156)
- 💾 Wordplay now keeps a copy of your projects, galleries, characters, and how-tos on your device, so they show up right away and keep working even when you're offline. Losing your connection no longer grays out the page; it just shows in the save status.

### Fixed

- 🤫 We made really long types in the guide a little shorter for readability.
- 🔗 Some concept links in the guide weren't working, but they are now!
- 🎨 The color picker's color band is now keyboard accessible for our friends that keyboards and screen readers.
- ✏️ We made it so that your text cursor positions are saved and restored correctly.
- 📡 When Wordplay can't reach the database, it now shows a clear message instead of freezing, and a shaky connection no longer logs you out or erases your saved work. The message also hints that a VPN, browser add-on, or network filter might be blocking it.
- 📖 We fixed the how-to space so it shows a loading spinner while it connects, instead of wrongly saying the space doesn't exist. (#1171)
- 📷 Small how-to and [Guide](https://wordplay.dev/guide) previews no longer turn on your camera or microphone; they only start when you press play.
- 🤝 We fixed a bug that stopped teachers who are in lots of [galleries](https://wordplay.dev/galleries) from seeing their projects.
- 📋 When you copy and paste your own code, we now keep it just as it is. Before, lines of text could get turned into a table by mistake.

## 0.19.2 - 2026-05-27

### Added

- 🔔 We now notify you when a new version of the site is ready while your tab is still open.

### Changed

- ⚡ How-to preview glyphs now appear right away for everyone in a gallery. Before, each browser had to figure out the preview on its own — now it's saved when the author saves a how-to, so everyone else sees it instantly.
- 📐 We made the toolbars across the app hide extra buttons in a popup menu (☰) when the screen is too narrow, so everything stays reachable on small phones. The page footer's links also shrink to just their emoji icons when there isn't room for the text.

### Fixed

- 🤝 We fixed the send button in the collaboration chat so it stays visible and works on narrow screens. (#1157)
- 🤝 We fixed a bug where new chat messages didn't appear until you switched browser tabs and came back. (#1158)
- 🐛 We fixed a bug where a "can't connect to the database" message would flash briefly during class when lots of students were editing at the same time. It was a false alarm — now it only appears if there are two connection failures in a row.

## 0.19.1 - 2026-05-26

This week we fixed several bugs that classrooms were running into.

### Fixed

- 📖 We fixed a bug where text typed in a how-to could disappear before it was saved. How-tos now save automatically as you write, so your work is safe even if you click outside the editor or get interrupted.
- 📖 New how-tos now land close to the others on the canvas instead of getting dropped far away or piled on top of each other, and you can finally drag apart how-tos that ended up stacked. Moving a how-to also pans automatically.
- ⚡ How-to preview glyphs no longer get stuck on a spinning placeholder when other people in the same gallery are editing.
- 🐛 We fixed a bug where projects could crash and freeze the page if a stream kept setting itself off in a loop. The runtime now stops the loop in time so the page keeps working.
- 💾 We fixed a bug where saving could silently fail after a long class period. Saves and live coediting now refresh your sign-in on their own and try once more, so an expired login doesn't cost you your work.
- 📛 We now limit project names to 64 characters and character names to 32 characters. Go wild within limits!

## 0.19.0 - 2026-05-23

This week we focused on multilingual coding features, improved conflict resolution, collaborative editing, and several bug fixes.

### Added

- 🤝 You can now edit a project together with up to four people at the same time. Edits, undo/redo, and other people's carets and selections all sync between collaborators as you type (#135).
- 🌐 You can now do math with Han numerals for Chinese, Japanese, and Korean (#2), Thai (#6), and Indic numerals for Bengali, Devanagari, Gujarati, Gurmukhi, Kannada, Tamil, and Telugu (#5, #7).
- 🌐 We added Bengali (#142), Indonesian (#148), and Romanian (#433)!
- 🌐 The emoji/glyph chooser now lets you filter by language scripts (#322).
- 🌐 We made text, names, and docs multilingual: tag them like `'hola kitty'/es_en` to mark them as a mix of languages (Spanglish, Franglais, and more), and then you can filter code and output by matching languages (#430).
- 🌐 The @Key stream now shows and accepts key names in your language. French programs can write `Key('Espace')` and English programs can write `Key('Space')`, and autocomplete suggests the named keys in your locale (#11).
- 🌐 The @Color structure now has shortcuts for those eleven common colors, with names in your language. Write `Color.red` in English, `couleur.rouge` in French, or `色.赤` in Japanese instead of mixing the color yourself (#109).
- 🌐 You can now give a project a name in many languages, like `"hi"/en"hola"/es`. The name shown matches your language, and search finds the project no matter which language you type in (#456).
- 🔠 We added font face previews to drop downs in the palette and settings!
- 🎤 We now ask for permission to cameras, microphones, and other inputs and show an exception if declined (#789).
- 📖 Added 11 new built-in how-to's to the [Guide](https://wordplay.dev/guide) on layout, the @Pointer stream, @Structure, picking from a list with @Random, conditional rendering, and physics with @Motion and @Matter.
- 📡 We added better feedback when the site is offline and saves are pending.
- ⬆️ We added a "back to top" button on long pages.
- 🟰 In an equals comparison, we menu's now suggest what the right might be based on the left.
- 🧱 Inside a structure, you can now mark a function or value with ↑ to make it belong to the structure itself instead of to instances. So you can write `Math.pi` and `Math.square(5)` without making a `Math()` first.
- 🧱 Every problem in your code now offers at least one suggested fix you can click to apply (#827).
- 🧱 When your code mixes math operators, like \1 + 2 · 3\, we now offer to fix it using math order (PEMDAS, so ^ runs before × ÷, which run before + −), or to keep reading order with parentheses (#333).
- 🔊 Screen readers now hear color names for @Phrase, @Group, @Stage, and @Shape, and as you move the sliders in the color chooser. We use the eleven most common color words across languages (red, orange, yellow, green, blue, purple, brown, pink, black, white, gray), and combine them for in-between colors like "light blue-purple" (#109).
- 🖱️ You can now drag the knob on the edge of the annotations sidebar to make it wider or narrower, and the same knob style is now used between tile panes.

### Changed

- 🌐 We made the default choices on the language choosers in the editor and stage clearer.
- 🔣 The script picker in the glyph chooser now lists which languages use each script.
- 🎨 We gave the [updates](https://wordplay.dev/updates) a little emoji to make the page easier to scan.
- 📝 We made @Phrase word wrapping locale specific (#164).
- 🛠️ We upgraded internal tooling for stability.
- 📖 Example code in how-tos and docs now shows every translation, not just the one matching your language.
- 🚦 When your code has a syntax error, the suggested fixes are now much smarter, better accounting for context (#885).
- 🚦 When your code has a type error, the suggested fixes are now much smarter too, with options like converting values, wrapping in a list, adding a missing input, or filling in a default (#1025).
- 🚦 When your code has a problem, we now show fewer follow-up conflicts that distract from the root cause. For example, if a name like `foo` is undefined, we won't also complain everywhere else `foo` is used (#1146).
- ⚡ The little glyphs on [galleries](https://wordplay.dev/galleries) and your [projects](https://wordplay.dev/projects) page now load right away instead of one per second. We also let you pick your own glyph for a project in the share dialog (#435).
- 💾 When projects don't save, the error message now lists which projects failed, why each one failed, and the technical error code to help with bug reports.

### Fixed

- 🌐 We fixed several localization problems in machine translated locales (#122).
- 🤝 When many people were sharing to a gallery at once, it could lead to some shares failing. That shouldn't happen anymore. We made similar changes to updates to chats, feedback, how tos, teacher classes.
- 🚦 We fixed problems with how text types with multiple options are shown as conflicts, especially with output animation styles (#541).
- 🔠 We fixed a few font face weight availability problems (#1026).
- 🚦 Now when a @Match or @Conditional references a stream in its case, then, or else, the the stream starts even when it's not referenced in the condition (#679).
- 🐞 We fixed the debugger so you can now step through anonymous functions and see each step as you go, instead of getting a confusing missing value error (#680).
- 🚦 We fixed a false conflict that appeared on anonymous functions in expressions like \[1 2 3 4].translate(ƒ(a) a + 1)\, even when the code was fine.
- 🚦 We fixed the conflict underlines so they follow the code when values pop in next to expressions while stepping through the debugger.
- 🐞 We fixed three problems related to type checking in conditionals.
- 🚦 Passing the @Color structure itself where a color value was expected (like `Phrase('hi' color: Color)`) used to be quietly accepted. It's now a conflict — write `Color.red` or `Color(50% 100 0°)` to make a color value.
- 🔊 In the code editor, typing now reads each character to screen readers, like a normal text field.
- 🔊 Stage output announcements now start with "output" so screen reader users can tell them apart from editor and chooser announcements, and @Text outputs read the actual text instead of just the word "text".
- 🚦 We fixed a bug where one syntax error could show up as two duplicate warnings.
- 📖 We fixed a bug where how-to's didn't show up for people with access to many galleries, like teachers with lots of classes.
- 📝 We fixed two bugs with the editor on iPhone and iPad that made it impossible to type.
- 🎨 Safari now renders color emoji correctly in markup.

## 0.18.0 - 2026-05-15

This week we focused on new and improved inputs and a new in-app localization mode.

### Added

- 👋 There's a new @Hand input! It uses the camera to check the location of your hand, which fingers are up, how many fingers are up, whether your hand is open or closed, and whether your palm is showing. What a handy input!
- 🤝 Added the ability to control which other galleries gallery how-tos are shared with.
- 🌐 We added a new in-app localization mode! Anyone can suggest revisions to any supported language within the app. Changes are stored locally until you submit them; a GitHub pull request is created and reviewed by maintainers before they become live (#437).

### Changed

- 🛠️ We upgraded internal tooling for stability.
- 🔣 We added more flexible custom character insertion.
- ⏯️ We added a play/pause button when playing a project
- 🐞 We now show the debug panel when the output tile is in full screen mode.

### Fixed

- 🔣 The to front and back buttons in the character editor didn't work.
- 🌐 Repaired a translation bug that prevented rendering of translated formatted text.
- 💡 Stopped autocomplete from preventing percent typing.
- ⚡ We reduced how much memory projects use when they are running or edited.
- 📱 Pinch to zoom on stage was broken on touch screens.

## 0.17.9 - 2026-05-09

### Added

- 🧭 There's a new "tour" help feature for each tile in the project view, explaining its purpose and core features. Try them out and let us know if we should expand the explanations! (#687).
- 🔍 Emoji searching now supports many more keywords (#1090), but also translations all of those keywords, so that works in all supported locales (#639).
- 🧩 Blocks have a new visual style for blocks editing mode, for improved readability. It also accounts for whether an editor is read only, hiding editing controls for more compactness.
- 💡 Menu suggestions in the editor are now much more helpful for locales (#1099), text and formatted literals (#635), and unit suggestions.
- 👀 How-to authors can now highlight expressions by adding 👀 inside some code's preceding explanatio, e.g., \¶👀¶"I'm highlighted!" This is helpful for how-to authors who want to emphasize some code.
- 📏 Block spacing can now be controlled.
- 🌐 We added a machine translated Tagalog locale (#1089).
- 🗂️ The guide in the project view now shows _all_ how-tos a creator has access to, can filter between just all and gallery-specific how-tos (#1087).
- ⬆️ Now there's a "back to top" link on long pages (#1097).

### Changed

- 🧩 We changed how blocks evaluate! Now, a Block with multiple non-`Bind` expressions will wrap the values in a list, instead of giving a warning and only evaluating to the last value. If your program had several expressions in a row and you only meant the last to be the result, wrap the earlier ones in `Bind` statements (or remove them). This will make it easier to create lists of values, including multiple `Phrase`s in a `Group`.
- 📐 We made the tile toolbar wrapping a bit better.
- 📱 We rearranged the project view footer to make the layout work better on smaller devices.
- 🔽 We improved the list expand/collapse behavior when there are more than 10 items.
- 💬 We improved the layout of code in the chat view (#1107).
- 🧩 We made input names in a blocks mode a drop down instead of editable text.
- 🛠️ We upgraded internal tooling for stability.
- 📖 We updated documentation for developers.

### Fixed

- 💡 We found and fixed a problem where the autocomplete menu wouldn't appear when activated in the menu.
- 🧹 We removed some unnecessary scroll bars (#1098).
- 📋 We fixed a problem with pasting in Edge (#1092).
- 🌐 We fixed a problem with duplicate translations crashing.
- 📋 We made copy and paste within the app more reliable and fast.
- 🎯 We made collision detection more reliable and less flickery.
- 🔣 We made Phrases with custom characters also eligible to drag, rotate, and scale.
- 🌐 We fixed the region on the Swedish locale.
- 🎨 We improved the contrast of links in light mode.
- ⏳ We added loading feedback when a new project is greated on the projects or gallery page.
- 💬 We fixed the very cramped width of chat messages when they have example code (#1107).
- 🧩 We improved line break rendering in blocks mode.

## 0.17.8 - 2026-05-02

### Added

- 🙏 We added a [thank you page](https://wordplay.dev/thanks) showing all of our GitHub contributors and thanking youth and funders (#279).

### Changed

- 📝 We changed the example code viewer to be a full fledged read-only editor so that you can select, copy, and drag parts of the example and also see conflicts, highlights, and explanations of the current cursor position.
- 💬 We added descriptions to the editor's cursor selection and the conflict pane to help explain what the selected code does. It should be a useful shorthand, supplementing the full documentation.
- 🔑 We added a default user of `creator/password` for developers who are testing on their computers.
- 🛠️ We upgraded internal tooling for stability.
- 🌐 We updated the URLs of the application always include the currently selected language(s). This makes the current language setting more reliable on page refresh and link sharing (#809).
- ⚡ We made it faster to load the home page.
- ⚡ We made the editor a bit faster to use; it was getting sluggish.

### Fixed

- 💬 We improved the position of the say feedback on stage so it wouldn't overlap with a chat text box.
- 🌐 We fixed typing for languages that have combining character inputs, like Hindi vowels (#1079).
- 🌐 We fixed several problems with the Japanese locale (#1048).
- 🧪 We made some of our tests more reliable.
- 💾 We fixed a rare project saving bug.
- 🎨 We fixed the contrast of the text cursor when the editor is in read only mode.
- 💥 We fixed a problem with how to errors crashing the browser.
- ⚡ We separated the updates of the example views and the project views to prevent lag (#1093).

## 0.17.7 - 2026-04-25

### Added

- 💡 We added better menu suggestions for placeholders.
- 🔄 We added resize and rotate controls on PhraseViews when in edit mode, and made editing and movement easier, for faster manual layout of phrases on stage.
- 📐 We made the tutorial responsive to the aspect ratio of the window.
- 🌍 We added the ability to make how to's public.
- 📝 We added a bullet button to the formatted text editor (#1072).

### Changed

- ⏯️ When the project is played, we close the palette, and when the palette is opened, we pause the project. That makes it clearer how to edit.
- ✍️ We improved the rendering and behavior of text selections in text editing mode.
- 👁️ We clarified the differences between the full screen buttons and the eye button (#1058).
- 🛠️ We upgraded internal tooling for stability.
- 💡 We made auto-complete during typing less aggressive and annoying.
- ⏱️ We made the animation speed selector in the stage toolbar a drop down instead, so it takes up less space.
- ⭐ We sorted feedback by stars then creation date.

### Fixed

- 📖 We fixed a problem where example code in markup didn't preserve space between lines (#1071).
- 🖱️ We fixed a problem in the editor where clicking in a position would sometimes start a selection.
- 🖱️ We prevented the editor from scrolling unexpectedly on click.
- 💬 We fixed a problem where tooltips in dialogs were duplicated in incorrectly positioned.
- 🌙 We improved dark mode documentation color contrast.
- 🌙 We prevented dark mode from flashing light mode on page load.
- 🎨 We fixed a problem where text selection and highlighting were the wrong color.
- 💬 We fixed the tooltip on the create account button.
- 🧩 When switching from blocks to text mode with a text range selected, the range is now set to just the first position, since selections aren't allowed in blocks mode.
- 💡 We fixed the width of submenus in the editor's autocomplete menus.
- ⏳ We fixed the project loading feedback; it was showing an error during loading instead of loading feedback.
- 📝 Bullets in markup with only one line separating them weren't working. Now they do!
- 🧹 We removed a period floating around the error.
- 💥 We fixed a case where creators who give multiple phrases the same name crashed the page.
- 🔣 We ensured character names are valid with no spaces (#1080).

## 0.17.6 - 2026-04-17

### Added

- We added a Portugese (Portugal) machine translation! Time to get to work to make it good.
- We added a <design system@://design> page so that anyone working on design or development for the platform have an easier guide on what colors, fonts, spacing, and components to use (#935).
- We made the user interface components more consistent, usable, and visible.
- We added a more salient button design, but we're not using it anywhere yet.
- We made more progress on the in-app localization editing feature! It's not quite ready to release yet, but it's getting closer.

### Changed

- We upgraded internal tooling for stability.
- We made the website load faster by finding a different way to load everything we know about Unicode.

### Fixed

- We fixed a minor problem where a minor error message was shown if someone was a collaborator on a project in gallery they didn't have access to.

## 0.17.5 - 2026-04-11

### Added

- We added search features to the projects and gallery pages, making it easier to find projects that have specific names, source file names, or text (#770).
- We added a search box to the emoji toolbar at the bottom of the editor, to make it clearer how to search for emojis (#1037).
- We added a new `Say` output, so you can make output that /speaks/ text, in addition to showing it on stage.

### Changed

- We upgraded internal tooling for stability.

### Fixed

- We fixed the highlight of the emoji chooser in the editor (#1037).
- We fixed a problem where code examples on Windows weren't being copied to the clipboard with the ctrl-C shortcut (#1038).
- We fixed many little issues with palette sliders, including incorrect tooltips and a lack of visible change on stage when changing size (#1032).
- Sometimes links in the guide had identical labels and subabels. Now they don't!
- We made speech bubble animations respect the aniamtion off setting (#1040).
- Some links concepts in the guide were not working, and were ambiguous, so we fixed the links and made them less ambiguous (#1035).
- We fixed a problem where autocompleting a conversion expression would sometimes wrap the wrong code.

## 0.17.4 - 2026-04-04

### Added

- We added debug and code labels to the project view, to be consistent with other tiles in the project view.

### Fixed

- Links in the guide were broken for names that were machine translated. Now they work! (#1027).
- We fixed the text color in drop down items (#1031).

### Changed

- We upgraded internal tooling for stability.
- We prepared many things to enable localization contributions directly on the website. It's not ready yet, but it's getting close! (#437).
- We redesigned buttons with backgrounds to make them pop a bit more.

## 0.17.3 - 2026-03-28

### Added

- We show the owner of a project in the gallery and projects previews.
- Programs can now start with documentation, even if they start with a borrow statement.
- When there's a way to convert an expression to an expected type, we suggest it as a resolution (#991).
- We added character echos when typing in the code editor (#540).
- We added little robot emojis to represent when some text has been machine translated.

### Fixed

- We fixed the text cursor position when spaces aren't shown explicitly.
- We made the full range of emojis visible in the editor's emoji chooser.
- We now only show conflicts related to the current source in the conflict list.
- We no longer auto-complete pasted text.
- We fixed the ability to wrap a selected node by typing an open parenthesis, list, or set.
- Did you know you can paste CSV data from the clipboard and Wordplay will convert it to a table value? We made this work better with CSV files with underscores in headers.
- We fixed rendering of skin tone modified emojis in the code editor.
- We fixed a problem where clicking to place the cursor in the editor would sometimes select a range.
- We now render line breaks in blocks mode, when appropriate (e.g.,), and place the cursor in more reasonable places (#927).
- When an input is added to an evaluation with the menu, it is added where the cursor is, instead of the end (#811).
- We fixed a problem where collaborators who were removed from a project could still see the project until they refreshed the page (#625).
- We improved the machine translation annotations on ARIA labels, for screen reader users, so they know when text was not written by a human.
- We localized catastrophic internal exceptions. Let's hope they never happen!

### Changed

- We upgraded internal tooling for stability.
- We stopped annoyingly autocompleting + and - expressions, as those might be positive or negative numbers you're trying to type.
- We now ignore space insertions when a placeholder is selected. That makes autocomplete less annyoying if you're used to typing a space, but also prevents accidental erasure of a placeholder with a space.
- We changed all simplified Chinese pronouns to be it (它) instead (#377).

## 0.17.2 - 2026-03-21

### Added

- We added a skin tone drop down to the emoji chooser (#779).
- We added a search to the tutorial, in case that's helpful for browsing by word (#992).

### Fixed

- We improved the usability and reliabilty of stage panning and output dragging on stage. Now you can more easily drag the stage to pan, use a mouse scroll wheel to zoom in and out, and use they keyboard to pan.
- Our spinning loading feedback stopped spinning. It's spinning again!
- We improved the consistency of names and symbols in concept links in the tutorial (#986).

### Changed

- We now check for locale problems in new contributor pull requests.
- We improved the layout of code examples in the code (#996).
- We improved explanations of concepts in the tutorial (#984).
- We improved the speed of testing before we release new changes.
- We upgraded internal tooling for stability.
- We improved the clarity of the unarchive project button (#1018).

## 0.17.1 - 2026-03-14

### Added

- We (finally) added emoji and symbol categories. As part of this, included all possible emoji variations and the new 17.0 emojis just released this year (#110).
- We added dates to the feedback, so we can see how long ago feedback was reported.
- We added a "select all of color" tool in the character editor (#994).
- We added a color picker in the character editor (only supported in Chrome, Edge, and Opera).
- We added saturation increase and decrease buttons to adjust the chroma of all colors in the character editor.

### Fixed

- We fixed the layout of the existing username checking feedback.
- We fixed some broken code in the @Example documentation.

### Changed

- We upgraded internal tooling for stability.
- We improved some Arabic translations.
- We arranged more reliable recoverable random numbers.
- We no longer permit only whitespace in the feedback form (#1008).
- We made locale checking less error prone for localization contributors.

## 0.17.0 - 2026-03-03

### Added

- We added a new @Speech stream, which works in most browsers. If you allow the site to use your microphone, you can make projects that respond to speech! (#394).
- We added a machine translation of a Hebrew locale (#411).
- We added a machine translation of a Vietnamese locale (#985).
- We made autocompletion of conversions smarter and less buggy.
- We added a zoom control to code editors for accessibility (#772).
- We added a zoom control to the stage.
- We added the /Courier Prime/ font.
- @Evaluate expressions can have commas in them now, in case you're used to other programming languages that separate function inputs with commas.

### Fixed

- Sometimes emojis have extra hidden symbols after them. We ignore them now so that emojis in code don't break things. (#970).
- We weren't properly handling commas after text and formatted literals. Now we do!
- Dropdowns weren't working in Safari. Now they do! (#978).
- The @Pointer stream stopped working, but we fixed it.
- When undoing an edit, the caret was sometimes restored incorrectly, making it impossible to move it.
- Sometimes edits would result in the editor crashing. We prevented those from happening.
- The feedback on sequence editor percentages was wrong. It's fixed now.
- When tooltips are near the top or left of the screen, we avoid covering the control they're describing.
- Project chat wasn't visible on small screens. We gave it a minimum height.

### Changed

- We adjusted the tablet-sized split view layout cutoff to better fit laptop screens.
- We moved the gallery how tos to the top of the guide, above the built-in how tos, to make local guidance more prominent than platform guidance.
- We upgraded internal tooling for stability.
- We generalized the name of "name separator" (commas) to "separator", since they can be used in other places.

## 0.16.45 - 2026-02-28

### Added

- **Times symbol**. Up to this point, Wordplay only used \·\ as a multiplication symbol. Now you can use \×\ too! That's now the new default, but both are still supported.
- **Better block conflict highlights**. Conflicts on a block are drawn much more clearly now!

### Fixed

- We now dismiss hints on mobile if the page is tapped.
- Initial loads on mobile devices are now less janky.
- Pasting code in text mode didn't always work. Now it does!
- We restored showing the full name in the guide, rather than the symbolic name. Oops!

### Changed

- We simplified conflicts, limiting them to just one message instead of two and improving their clarity.
- We made a suggestion to name an unused value in a @Block.
- We simplified conflicts when a function name can't be found.
- We no longer show space indicators by default, as it can be confused with the multiplication operator (#961).
- We made code editor cursor descriptions of functions simpler and easier to read.
- We stopped binds with types from wrapping in @Block mode, so they're easier to read.
- We upgraded internal tooling for stability.

## 0.16.43 - 2026-02-22

### Added

- **How to translation**. We added the ability to create machine translations of how to's in a gallery.

### Fixed

- We localized a "username taken" feature.
- We improved some Spanish translations.
- We no longer release a new version when there is a problem with Wordplay's code or locales.

### Changed

- We upgraded minor versions of internal tooling for stability.
- We cleaned up some of the locale translation feedback for developers.

## 0.16.42 - 2026-02-14

### Added

- **How to permissions**. How to authors can make their how to's visible to broader audiences.
- **Chinese translations of how to examples**. Thank you to our localizers for their translations!

### Changed

- We upgraded minor versions of internal tooling for stability.
- Input streams that correspond to a single input device now re-evaluate the program only once, even if there are multiple streams for that device created.

### Fixed

- The emojis weren't appearing in the timeline. We fixed it so that they would appear again.
- Project tiles were collapsing on page reload. We stopped that from happening!
- Added a missing background to the clear all notifications button.

## 0.16.41 - 2026-02-07

### Added

- **Updates highlight**. We now highlight the updates link on the landing page when there are new updates.
- **Gallery chat moderation**. Creators in a gallery can report problematic chats to curators of a gallery, and curators can moderate those messages.
- **Organized the galleries page**. All galleries — yours, examples, and public galleries — now appear on the galleries page (#594, #799).

### Changed

- We made it slightly easier for project maintainers to add moderator, teacher, and other account privileges.
- We upgraded minor versions of internal tooling for stability.
- Markup can now handle multiple translations. The current primary language will be rendered.
- We hid a drop down menu for text type words, since those have to be typed, and so the menu would be empty.
- We added insertion points in blocks mode for optionally empty fields of a block.
- We added a cleaner visual design for type blocks.

### Fixed

- We fixed a problem with the rotating locale chooser on the landing page (#942).
- We avoid machine translating of symbolic names, which sometimes are converted in strange ways by Google Translate.
- We fixed the time zone on updates page, so the date is always in Pacific time.

## 0.16.40 - 2026-01-31

### Added

- **New locales**. We added machine translated drafts of _Arabic, Greek, Kannada, Telegu, and Assamese_ locales! We're sure there are many improvements to make, since AI is far from perfect, so reach out if you'd like to help improve them.
- **Names in the guide**. We added all of the names of functions, structures, and streams to the guide, to make it easier to know the many multilingual names by which they can be referred (#934).
- **Better drop downs**. We added fancy new drop down menus, to make it easier to select. _This only works in Chrome, but it should release in Safari soon._ (#729).
- **A new updates page**! We created this updates page so you know what's changed recently. We don't translate it to all of our supported languages yet, but maybe your browser will help with that? (#351)

### Changed

- We improved the behavior and visual design of output selections when the palette is open (#932).
- We upgraded minor versions of internal tooling for stability.

### Fixed

- Deleted characters no longer come back from the dead (#899).
- We improved the unparsable tutorial in blocks mode (#929).
- We improved screen reader accessibility.
- Evaluate expressions are no longer renamed when autocompleted (#934).
- The current layout tooltip now disappears when no longer hovered (#933).
- The palette no longer shows current values when the program is paused.
- Changing the font of a phrase correctly resizes the phrase on stage.

## 0.16.39 - 2026-01-24

### Added

- We added login links to messages asking you to log in (#892).
- When some text is edited in one locale, we re-translate other locales if they haven't been written by a human yet.
- We added keyboard shortcuts to switches (#913).

### Fixed

- We fixed a UI highlight in the tutorial (#919).
- We corected an example in the tutorial (#893).
- We improved the visibility of tutorial highlights (#915).
- We fixed an inconsistency between tutorial text and output (#916).
- We fixed a problem with changed stream evaluation that was making \Scene\ not work.
- We better synchronized the blur and keyboard idle effects on stage (#891).
- We removed custom characters from the emoji picker in the character editor (#910).
- We made the tooltips at the edge of window stop flickering (#895).
- We improved the hover feedback on editable text in the code editor (#901).
- We corrected the tile resizing behavior in the tutorial (#912).

### Changed

- We upgraded minor versions of internal tooling for stability, such as the _ColorJS_ library, which we use for colors.

## 0.16.38

### Changed

- Updated minor versions of firebase, firebase-functions, zod, prettier-plugin-svelte, vite, vitest.

## 0.16.37

### Fixed

- Less flaky authenticated end2end tests.
- No redirect to login page prior to auth registration.
- Fixed #873: Consistent color emoji usage in markup.
- Fixed #872: Inconsistent links across landing pages.
- Fixed #874: Fixed tooltip positioning in scrolled dialogs.

### Added

- Merged #875: Cycling language chooser on landing page.
- Added Open Graph metadata for previews.

### Changed

- Updated minor versions of Svelte, SvelteKit, vite.

## 0.16.36

### Fixed

- Fixed stale reference warnings.
- Worked around Firebase functions regression.

### Changed

- Updated minor versions of `svelte`, `@sveltejs/kit`, `prettier`, `tsx`, `vite`, `vitest`, `firebase-functions`.
- Removed `ts-jest` dependency.

## 0.16.35

### Added

- Fixed #865: Added formatted text editor with basic toolbar and keyboard shortcuts.

### Fixed

- Fixed #866: Inconsistent exit behavior when leaving output full screen mode.

### Changed

- Updated minor versions of `@playwright/test`, `prettier`, `svelte`, `vitest`, `zod`, `nodemailer`

## 0.16.34

### Fixed

- Removed extra space before bullets.

### Changed

- Updated minor versions of SvelteKit, Svelte, vite, vitest.
- Removed unused `firebase-functions` and `firebase-functions-test` dependencies.
- Updated functions dependencies: `@google-cloud/translate`, `@types/nodemailer`, `firebase-admin`, `firebase-functions`
- Override `cookie` package to resolve vulnerability.

## 0.16.33

### Fixed

- Fixed #855: Show editor and output locale chooser when there is at least one explicit tag.
- Fixed #856: Added standard tooltip and drop down arrow to options.
- Fixed #852: Prefer full names over symbolic names in translation.

### Changed

- Removed unused `@types/npm`, and `@types/uuid` dependencies.
- Updated minor versions of Svelte, SvelteKit, svelte-check, vitest, Firebase.

## 0.16.32

### Changed

- Updated minor version of Svelte.

## 0.16.31

### Fixed

- Fixed #854, accounting for lack of COLRv1 support in Safari.

### Changed

- Updated minor versions of firebase-admin, svelte, vite
- Updated to vitest 4.

## 0.16.30

### Changed

- Ensure types exist before Playwright tests.
- Fixed font-size in footer. For some reason we made it small.
- Updated minor versions of Svelte, SvelteKit, Firebase, vitest, nodemailer, firebase-functions.
- Improved styling of drop down size
- Fixed settings label layout.
- Consistent language descriptions in locale choosers.

## 0.16.29

### Changed

- Updated minor versions of Axe, Svelte, SvelteKit, firebase-functions, vite, vitest.
- Fixed #840: improved source tile toggle contrast and labels.
- Fixed #841: improved concept group expand/collapse visual design.
- Don't permit whitespace wrap in subheaders.
- Fixed #843: Don't give tutorial projects a name, in case locale changes.
- Fixed #845: Resolved sticky tutorial navigation when concept link clicked.

## 0.16.28

### Fixed

- Fixed login regression introduced by Svelte regression.

## 0.16.27

### Fixed

- Made undo, redo buttons important, other navigation commands unimportant.
- Fixed #838: Consume enter/space after glyph insertion in editor.
- Prevent jiggle of creator view in project footer after edits.
- Fixed #839: Ensure correct locales in Project basis to match documentation to selected locale.

### Changed

- Updated minor versions of Axe, Google Translate, Svelte, chalk, decimal.js, dexie, firebase, prettier, typescript, vite, vitest, zod.

## 0.16.26

### Changed

- Updated minor versions of Svelte, SvelteKit, vite-plugin-svelte, svelte-check, tsx, vite, playwright

## 0.16.25

### Changed

- Updated Svelte, SvelteKit, Firebase, vite, zod, and some type definitions.

## 0.16.24

### Changed

- Updated svelte, @sveltejs/vite-plugin-svelte, @sveltejs/kit, chalk

## 0.16.23

### Fixed

- Eliminated hidden dependency crashing editor.

### Changed

- Updated minor versions of Svelte, SvelteKit, Vite.
- Updated uuid to 12.
- Error reporting on TileView failure.

## 0.16.22

### Fixed

- Improved tooltip on concept links.
- Fixed type error on Volume.
- Hide tooltip if target is removed from DOM.

### Changed

- Updated minor versions of zod, vite, Typescript, Svelte, Firebase, Firebase Admin, Dexie, Playwright.

## 0.16.21

### Added

- #815: Added coordinates to axes when grid is on.

### Fixed

- Save characters even without name and description to prevent data loss.
- Typos in documentation and tutorial.
- Fixed infinite recursion in Scenes.

### Changed

- Updated minor versions of Google Translate, Playwright, Svelte, SvelteKit, Firebase.
- Update major versions of vite and vite-plugin-svelte.
- Updated to Firebase 12.
- Updated to Zod 4.

## 0.16.20

## Added

- Fixed #810, implementing responsive layout for mobile and tablets.

## Fixed

- Clarified tooltips for save status.
- More robust node replacement when source isn't found.
- Consistent mono locale emojis.
- Unset locale after translating project.
- Don't translate texts that are supposed to be one of a literal text type.

## Changed

- Updated Svelte, SvelteKit, vite, prettier
- Removed eslint (it was unused)

## 0.16.19

## Added

- Fixed #536: More discoverable tooltips.

## Fixed

- Fixed #792: Broken links to node concepts in guide.
- Fixed #805: Clarify meaning of camera and microphone chooser.
- Fixed several defects in how to translation, respecting file and markup structure.
- Ensure code examples are localized.
- Fixed #801: Slightly more visible concept link underlines, consistent with other links.
- Fixed #751: Corrected inconsistency in simplified Chinese locale login screen.
- Fixed #803: Adjusted behavior of code examples in standalone guide.
- Fixed name of Noto Korean font file.
- Fixed #746: Typo in Korean tutorial.
- Fixed #688: Added aria-label to editor textarea.
- Fixed concept link font size in Safari.
- Fixed #338: Reference formatted literals in `Phrase` docs.
- Fixed #328: Finished localizing moderation page.
- Fixed #744: Clarifying output locale drop down.

## Changed

- Updated Playwright, Svelte, SvleteKit, eslint, firebase, tsx, vitest, zod, nodemailer, firebase admin, Google Translate.
- Added timeline toolbar tests.
- Better chunking of build for faster load times.

## 0.16.18

## Added

- Fixed #454, fixed #695: simplifying toolbar buttons.
- Fixed #470: Custom sequence descriptions for screen readers.

## Fixed

- Preserve regions when repairing locales.

## Changed

- Updated Axe, SvelteKit, eslint, Firebase, zod, vitest minor versions.

## 0.16.17

## Fixed

- Updated translation script to permit overriding machine translations with new machine translations.
- #781: Updated traditional Chinese with correct machine translations.
- Clear streams resolved to prevent memory leak.
- #722: Give ARIA-label to `CodeView`.
- #721: Contrast of values in dark mode.
- #689: Header contrast over error colors in dark mode.
- #681: Don't allow end token to be selected.

## 0.16.16

## Added

- Smaller font for secondary conflict messages.
- Show all conflicts if there's no selected conflict.
- Added headers to conflicts for clarity.
- Button to show code annotation concerns.

## Fixed

- Fixed #748 correcting guide back button.
- Fixed #760 correcting keyboard selection of locale.
- Fixed #776 passing region to Google Translate.
- Added missing translations.
- Fixed cursor placement after reversed range deletion.
- Reversed default order of vertical layout.
- Fixed translation choices in project translate dialog.
- Fixed undefined symbols for speech causing crash.
- Permit required named expressions out of order in an `Evaluate`
- Gracefully ignore extra inputs to an `Evaluate`.
- Ensure conflict highlights are rendered after edit.
- Fixed type exception value type.
- Fixed bug where type over was reversed.

## Changed

- Updated all minor versions.

## 0.16.15

## Added

- Added GitHub URLs and ability to comment to feedback form.

## Fixed

- Fixed #767 Correcting animation speed labels.
- Preserve multi-region IDs in locales.

## 0.16.14

## Added

- Fixed #755 Machine translation of traditional Chinese tutorial.
- Allow feedback editing by owners or moderators.
- Added a warning when a character name is referenced in plain text.

## Fixed

- Improved description of project archive tooltip.
- Refined feedback reading rules to permit read without authentication.
- Show local projects without owner.
- Allow markup templates to evaluate to markup.

## Changed

- Updated minor versions of SvelteKit, Svelte, svelte-check, eslint, tsx, vite, vitest, zod, firebase-admin
- Updated to nodemailer 7.0.

## 0.16.13

## Added

- Fixed #370 Split view controls on horizontal and vertical layouts.

## Fixed

- Fixed #723 regression of tile dragging in free layout.
- Fixed #740, resolving stuck tutorial advance button when guide is open.
- Fixed #750 only handle keyboard shortcuts when editor is focused.
- Added choose your own adventure how to.

## Maintenace

- Updated minor versions of Playwright, SvelteKit, Eslint, Firebase, Svelte, Vite, Vitest, and Zod.

## 0.16.12

## Added

- Copy custom character.
- Added another how to for making choices.

## Fixed

- Account for empty name list.
- Fixed #734. Typos in account creation.
- Fixed wrapping and alignment of how to links.
- Strip zero width spaces from tokenizing; they serve no purpose.
- Don't localize operators.
- More precise tokenizing of URLs to allow for <3 emoticons.
- Fixed select all in character text box.
- Don't require spaces after bullets in markup.
- Added "font" to English and Chinese names, even though it conflates "typeface" and "font".
- Fixed localization of function inputs in guide.
- Fixed duplicate search results.
- Fixed multilingual guide search.
- Removed legacy support for a list of text in Phrase.
- Fixed positioning of dragged tiles from guide.

## 0.16.11

### Added

- Added a few story examples to the gallery.
- Added to game-related how to documents.

### Fixed

- Fixed password requirement inconsistency
- Better troubleshooting info for clipboard operations.
- Fixed localization of references when editor locale is selected.
- Don't do rename on bind when inserting spaces before name.
- Less jumpy evaluate suggestions.
- Fixed example conflict.
- Fixed case where flipped selection range wouldn't copy.

### Changed

- Updated Svelte, SvelteKit, Typescript, eslint, Vite, and Vitest.

## 0.16.10

### Added

- Added 2x, 5x, and 10x play time, to help with `Scene` testing.

### Fixed

- Added unit to initial `Pitch` value.
- More visible home link in footer.
- Don't autocomplete `<` symbol.
- Enable pointer events on links in inactive `Phrase` output.
- Fixed label size consistency.
- Always show collaborators in character share dialog, even when public.
- Only allow one feedback vote per page load.
- Split owned and shared characters on the characters page.
- Split owned and shared projects on projects page.
- Allow mods to edit feedback.
- Fixed dialog scroll closing behavior.
- Allow dragging of multiple selection.
- Allow for pixel fill on existing colors.
- Fixed several pixel and fill undo errors.
- Fixed pixel fitting algorithm.
- Better labels on elided data structures.
- Fixed #732, improving English placeholder dialog.
- Improved display of values when paused.
- Clarified visibility of chats for curators.
- Flipped scroll zoom on stage.
- Fixed several translation errors.

## 0.16.9

### Added

- Fixed #699, basic feedback reporting tool.

### Fixed

- More precise handling of undefined and optional (?).
- Fixed #723, tile dragging in tutorial.
- Don't deploy on PR.
- Run all tests on merge.
- Renamed `Feedback` to `Notice`.
- Migrated to from page state to stores.

## 0.16.8

### Added

- Expanded eraser to delete shapes on click.
- Smooth, connected pixel strokes.
- Multiline chat messages.
- Double-click to fill pixels in a region.
- Import emojis in character editor for remixing.
- Fit content to box.

### Fixed

- Prevent undefined fields on character JSON.
- Narrow concept regular expression to avoid greedy matches on hexadecimal numbers that prefix names.
- Fixed keyboard shortcuts for Windows control key.
- Fixed swapped icons on character share.
- Fixed #719, improving clarity of mode widget selection.
- Fixed rendering of unknown types.
- Fixed #715, improving language and region names on stage chooser.
- Preview aura when editing.

### Changed

- Updated Google Cloud Translate, Playwright, Svelte, SvelteKit, Vitest, Eslint.

## 0.16.7

### Added

Character editing features:

- Added undo/redo keyboard shortcuts.
- Added custom character how to.
- Fixed #712, adding pixel eraser.
- Fixed #717, correcting redundnant undos.

### Fixed

Character editing improvements:

- Prevent character editor from scrolling.
- Ensure no undefined in character fields to prevent saving errors.
- Properly bound drawing cursor position.
- Longer undo history.
- Undo entire strokes, not individual pixels.

## 0.16.6

### Added

- Added Papyrus, Broadway, Dreamin Outloud, Modern Love, and Delius (Times equivalent).
- Added Chinese, Korean, and Japanese fonts.
- Added official Korean locale support.
- Only show source file names if more than one source, to reduce confusion about project name.
- Added language script names and include them in font choosers for support clarity.
- Fixed #705, autoscroll tile views.
- Don't hide code when debugging; just elide values and place them inline.
- Allow locales to specify multiple regions they apply to (e.g., Tamil in India, Sri Lanka, Singapore).
- Fixed #708, improving palette editing from code editor.

### Fixed

- Forward delete selection now deletes selection.
- Only show fonts that support the script of the currently selected languages.
- Prevent extra spaces in first segment of markup paragraph.
- Fixed 'an'/'a' typos in English locale.
- Fixed pose editing effect crash.
- Show new source when added.
- Clarified permissions for curators and creators
- Hid associated classes for a gallery if empty.
- Less sensitive text selection drag initiation.
- Don't go browser back when at the beginning of the timeline.
- Fixed timeline dragging.
- Better feedback after button press.
- Store project history state as raw, not deeply reactive, as its immutable.
- Fixed source value history preservation bug.
- Fixed missing evaluation dependency in outline updates.
- Fixed missing keyboard input dependency on evaluation.
- Eliminated proactive root walk to reduce edit overhead.
- Account for undefined evaluation context in tutorial.

### Changed

- Updated minor versions of Svelte, SvelteKit, Vite.

## 0.16.5

### Fixed

- Prevent scroll bars on window.
- Improved contrast of inactive color in dark mode.
- Fixed Serbian typo.

## 0.16.4 2025-03-10

### Fixed

- Increased compatibility of Firebase connection for complex school networks.
- Deactivated confusing blocks mode for now; everyone was perplexed by the "experimental" label.
- Less intense typing jump animation.
- Fixed Punjabi reading order.
- Resolved several evaluator memory leaks.

## 0.16.3 2025-03-08

### Added

- By student request, allow custom characters in profile and creator views.
- By student request, added Comic Neue as a supported font! Long live Comic Sans.
- Fixed #264, adding text selection to code editor.

### Fixed

- Grow text boxes
- Improved spacing of profile page.
- Prevent accidental overwriting of English locale when verifying locales.
- Deploy to staging on main PR, prod on main merge.
- Only run tests and checks on PR, not merge.
- Allow selection of names with escape key, rather than selecting parent.

### Changed

- Updated Google Translate, Svelte, SvelteKit, Firebase, Prettier, TypeScript, Vite, Vitest.

## 0.16.2 2025-03-02

### Fixed

- Added more detail to text literal locales in LANGUAGE.md.
- Fixed #698 resolving gallery project write status defect.

## 0.16.1 2025-02-25

### Fixed

- Better inactive color contrast in dark mode.
- Fixed #691: Reset path when changing guide mode.
- Don't use blocks mode for code examples.
- Fixed #690: Adding labels to token fields in blocks mode.
- Don't show how to guide by default in tutorial.
- Vertical layout of project sets.

### Changed

- Updated types, eslint, prettier, svelte, tsx, uuid, vite, vitest, and firebase functions.
- Fixed #528: Deploy to prod on push or merge to main.
- Refactored widgets to use locale accessor functions instead of strings, for provenance.
- Refactored nodes to return locale accessor function instead of specific locale, for provenance.
- Refactored node labels to return locale accessor function, for provenance.
- Wrapped most localized text, for provenance.

## 0.16.0 2025-02-25

### Added

- How to guide! This feature adds a new section to the guide, which provides short tutorials about common behaviors.

## 0.15.2 2025-02-15

### Added

- Allow ∂ in addition to ∆ for change, for consistency, and because of error in code examples in CHI 2025 paper.

### Changed

- Updated minor versions of Svelte, SvelteKit, ESLint, Firebase, Prettier, Zod.
- Enforce organized imports on save; removed import cycles.

## 0.15.1 2024-02-08

### Added

- New character button in glyph chooser.
- Check for global name collisions between locales.
- Added mechanism to mark a string revised, so that others can be checked for revision.

### Fixed

- Localized unlocalized buttons.
- Don't allow users to add themselves to a creator list.
- Better claim checking for teacher page, to explain what teacher accounts are for.
- Fixed dark mode loading.
- Fixed #673, more visible links in paragraphs.
- Fixed #672, more visible links in feedback with background color.
- Serialize locale verification.
- Fixed French translation errors.
- Fixed Gujarati translation errors.
- Fixed Hindi translation errors.
- Fixed Marathi translation errors.
- Fixed Punjabi translation errors.
- Fixed Tamil translation errors.
- Account for full width punctuation in reserved symbols.
- Disable background animation for speed.

### Changed

- Updated firebase and firebase-functions.

## 0.15.0 2024-01-26

### Added

- Added a slightly more organized glyph chooser, exposing emojis and improving layout.
- Custom emojis and symbols! There's a brand new editor for them and we reuse the concept link syntax `@myemoji`.

### Fixed

- More consistent button icons.
- Resolved name conflict in German.
- Fixed infinite loop on self-referential structures.
- Improved colors of character emojis.
- Improved color emoji handling on Safari.
- Handled missing `compositionend` event on Windows emoji picker.
- Handled inconsistent cross-platform firing of `compositionend` events
- Accurately calculate caret position for multi-codepoint emojis.
- #659: Prevent re-opening of dialog when closing with keyboard.
- Fixed selected output functionality in tutorial.
- #657: Fixed focus on tutorial buttons.
- Always localize delimiters

### Changed

- Updated minor versions of all dependencies.

## 0.14.2 2024-01-18

### Fixed

- Removed all unused imports and variables.
- Mono emojis for dialog buttons.
- Consistent use of globe as locale icon.
- When only showing preferred languages in editor, hide non-preferred, tagged translations if there are untagged translations.
- Tidy all source in a project after translation.
- Simplified editor language chooser.
- Fixed #649: broken links in translations.
- Fixed #646: docs not showing correct locale.
- Removed locale annotations from tutorial text.
- Only show code locale chooser if more than one locale present.

## 0.14.1 2024-01-11

### Added

- Click outside dialog to dismiss it.
- Fixed #603 Machine translation of tutorials.
- Include all draft locales, but mark as draft.
- Translate to any Google Translate supported language.

### Fixed

- Tutorial typos
- More precise empty input lists in locale schema.
- Fixed node concept links.

### Maintenence

- Cleaned up the supported locales code.
- Clarified language chooser functionality.
- Removed example localization check.

## 0.14.0 2024-12-27

### Added

- Fixed #519, adding the ability for teachers to create classes, student accounts, and galleries associated with classes.
- Added ability to refer to initial bound reaction values by name.
- Prioritize emojis in character chooser.

### Fixed

- Permit reference to initial value in reactions.
- Phrases shouldn't intercept pointer events unless selectable, so selectable things are selectable.
- Don't scroll to caret on evaluation update.
- Prevent undo/redo from going to browser.
- Correctly restore position after undo/read.
- Fixed async issues with conflict updates in project view.
- Autocomplete elision symbol outside of rich text.
- Don't show moderation warning on editable projects.
- Handle caret pointer placements below the last line correctly.
- Don't filter output interfaces from the concept index.
- Fixed bad wrap within docs ending in newline.
- Tick for collisions.
- Keep focus on keyboard-moved phrase.
- Render Markup values as symbols for debugger to highlight.
- Fixed Phrase dragging in output view.
- Performance improvements to editor.
- Fixed teach and learn emojis on landing page.

### Changed

- Updated minor versions of Svelte, Sveltekit, Vite.
- Upgraded to Firebase 11, Firebase Functions 6, Firebase Admin 13
- Consolidated organization of database-related files.

## 0.13.3 2024-12-14

### Added

- Added ability to change user interface font to one of the supported fonts.
- Fixed #604, adding a project chat feature to enable communication between project collaborators and gallery owners.
- Migrated to Sveltekit page state.

### Fixed

- Simplified login and join pages.

### Changed

- Updated minor versions.

## 0.13.2 2024-12-09

### Added

- Error boundary to prevent `TileView` errors from causing crash.

### Changed

- Updated all minor releases of dependencies except for Firebase.
- Build functions before starting emulator

## 0.13.1 2024-11-30

### Fixed

- Resume animations after unpausing
- Fixed $effect cycle in palette
- Fixed label ids on palette
- Fixed exiting reactivity bug in StageView.
- Fixed Safari color emoji rendering.
- Fixed history update on initial guide navigation.
- Fixed rendering of text values for stepping highlights.
- Fixed spacing on subheaders.

### Changed

- Add svelte-check to CI.

## 0.13.0 2024-11-02

### Fixed

- Don't show expand/collapse toggle on guide.
- More consistent use of color and monochrome emojis.
- Removed several unused contexts.
- Faster caret movement by eliminating unnecessary recomputation.
- Fixed free form project layout.
- Corrected several invalid HTML issues for hydration.

### Changed

- Migrated to Svelte 5, converting to $state, $derived, $effect, and snippets.
- Updated point releases of all dependencies, except Firebase.

## 0.12.4 2024-10-26

### Added

- Added animation speed controls to stage

## 0.12.3 2024-10-12

### Fixed

- Fixed rendering of recent values in debugger.
- Fixed debugger highlights on literal values.
- Fixed UI ID for stage to correct highlight.
- Don't wrap node sequences in blocks mode.
- Describe added nodes during editing.
- Fixed ARIA bugs on autocomplete menu.

## 0.12.2 2024-10-5

### Fixed

- Corrected debugger behavior in the presence of reused values.

## 0.12.1 2024-09-28

### Fixed

- Corrected spacing on home page of header.
- Properly render placeholders in blocks mode.
- Consistent rendering of inferred and explicit placeholder types.
- Better type checking on operator wrapping
- Don't show full names of operators.
- Fixed evaluate autocomplete.
- Removed column layout of documented expressions.
- Changed explanation delimiter to ¶ for clarity, disambiguation in parsing.
- Allow entry into emtpy field lists with no tokens.
- Better handling of empty words tokens in blocks mode.
- Fixed caret position for newlines in interior blocks.
- Removed invalid symbol type from placeholder token.

## 0.12.0 2024-09-22

### Add

- [#529](https://github.com/wordplaydev/wordplay/issues/529) Redesign of blocks mode for accessibility and error-prevention. Much to do to make it super polished, but it's better than the previous version.

## 0.11.2 2024-09-17

- Show conflicts even when paused.

### Changed

- Several dependendabot pull request updates.

## 0.11.1 2024-08-25

### Added

- Custom descriptions of Stage, Group, Phrase, and Shape output, overriding default descriptions.

### Fixed

- Included past tense verbs in higher order functions.
- Fixed aria-label updates.
- Drop old announcements if the queue exceeds three, preferering most recent.

## 0.10.10 2024-08-12

### Fixed

- [#550](https://github.com/wordplaydev/wordplay/issues/550) Ensure owned projects are marked as owned when loaded directly from Firestore.

## 0.10.9 2024-08-10

### Added

- Formatted different types of references

### Fixed

- Added missing variation selector.
- Ensure projects are unmoderated by default.
- Cleaned up animation logs in `Animator` to ensure that new outputs with the same name can animate again.

## 0.10.8 2024-08-03

### Fixed

- Repaired borrowed bindings from other sources.
- Prevent project reevaluation during typing.
- Permit evaluation of functions with operator names without inputs.

## 0.10.7 2024-07-27

### Added

- Ability to copy one's own projects.

### Fixed

- Fixed text sorting.
- Preserve concept on guide page refresh.
- Show multiple names when present in guide.
- [#533](https://github.com/wordplaydev/wordplay/issues/533) Fixed URLs to tutorial.
- [#542](https://github.com/wordplaydev/wordplay/issues/542) Provide error message for < Safari 16.4.

## 0.10.6 2024-07-20

### Added

- Persist annotations window collapse/expand state.

### Fixed

- Fixed color of example code in docs.
- Changed unused bind conflict to only highlight name, not value.
- More reliable stage value announcements.
- Fixed case where stream expression is the condition, as opposed to in a condition.
- Fixed order of `MissingInput` conflict dialog.
- Change to no localization after translation.
- Polished live region announcements to prevent redundant reading.

## 0.10.5 2024-07-13

### Added

- Line numbers in editor.

### Fixed

- [#514](https://github.com/wordplaydev/wordplay/issues/514) Fixed cursor position on hidden language tags.
- [#485](https://github.com/wordplaydev/wordplay/issues/485) Allow selection of language for output.
- [#524](https://github.com/wordplaydev/wordplay/issues/524) Fixed color of drop downs in dark mode.
- [#525](https://github.com/wordplaydev/wordplay/issues/525) Ensure projects are removed from galleries, even if they somehow didn't have a gallery ID in them.
- [#515](https://github.com/wordplaydev/wordplay/issues/515) Ensure local projects get an owner after logging in.
- [#520](https://github.com/wordplaydev/wordplay/issues/520) More generous parsing and conflicts around binary and unary evaluates.
- [#523](https://github.com/wordplaydev/wordplay/issues/523) More general handling of hidden tokens in cursor positioning.
- Fixed parsing bug that prevented complete parsing of the program.
- Fixed reactivity dependency bug that included evaluates in branch dependencies.
- Fixed selection of locale in evaluation.
- Reset owner and collaborators of copied project.
- Added variation selectors to emojis for Safari.
- Stripped machine translation tags from locale text on render.
- Fixed name of locale text JSON schema.
- Hide login link on landing page if logged in.
- Fixed closing text delimiter localization.
- Hide comma separator when localizing names and docs.
- Permit comma separators between text literals, docs, and names, allowing line breaks for text.
- Define `Input`s corresponding definition to enable code localization.
- Improved `MissingInput` conflict.
- Changed value of divide by zero to non-a-number; defined not-a-number literal.
- Improved dark grey contrast.
- Ensure templated strings are localized in tooltips.
- Allow addition to be used as a unary operation.
- Don't tokenize negative numbers; treat them as a unary evaluation.
- More consistent button styling.

### Changed

- Added additional reactivity tests to cover granular re-evaulation of random.
- A basic project test to ensure all windows are visible.
- Simplified concretization of locale strings.

## 0.10.4 2024-07-08

### Fixed

- Added expressions control dependent on streams to expressions to reevaluate on reaction.
- Fixed background of buttons to make them visible on stage.
- Fixed grid line complementary color.

## 0.10.3 2024-07-07

### Fixed

- [#509](https://github.com/wordplaydev/wordplay/issues/509) Fixed parsing regression from infinite loop fixes.
- [#507](https://github.com/wordplaydev/wordplay/issues/507) Fixed Webpage stream replay bug.
- [#216](https://github.com/wordplaydev/wordplay/issues/216) Improved design of view code and copy buttons.
- [#397](https://github.com/wordplaydev/wordplay/issues/397) Redesigned home page for clarity and navigability.
- [#506](https://github.com/wordplaydev/wordplay/issues/506) Clarified behavior of localized setting.
- [#511](https://github.com/wordplaydev/wordplay/issues/511) Fixed granularity of reevaluation to preserve random values and animations.
- [#512](https://github.com/wordplaydev/wordplay/issues/512) Semi-automated batch translation of locales on command line.
- Added fade out sequence.
- Fixed select all button.

## 0.10.2 2024-06-29

### Fixed

- Better tab symbol to clarify keyboard shortcut and whitespace meaning.
- Improved contrast of delimiters and borders in dark mode.
- Correct typos in tutorial.
- Ensured type errors when a structure definition is given instead of a structure value.
- When generalizing a union type of function types, generalize their output types.
- Repaired structure of Korean locale.
- [#503](https://github.com/wordplaydev/wordplay/issues/503). Prevent infinite loops in parser.
- [#504](https://github.com/wordplaydev/wordplay/issues/504). Account for non-fixed-width characters in caret positioning.
- [#488](https://github.com/wordplaydev/wordplay/issues/488). Added animations off indicator on stage.
- [#500](https://github.com/wordplaydev/wordplay/issues/500). Improved explanation when there's a space between an evaluation's name and inputs.
- [#455](https://github.com/wordplaydev/wordplay/issues/455). Replaced `Bind`s with `Input`'s in `Evaluate` and table operations to prevent invalid bind metadata in evaluations.

### Changed

- Upgraded to TypeScript 5.5.

## 0.10.1 2024-06-22

### Fixed

- [#104](https://github.com/wordplaydev/wordplay/issues/104). Created a standalone language reference.
- [#489](https://github.com/wordplaydev/wordplay/issues/489). Handled very large strings generated by text.
- [#490](https://github.com/wordplaydev/wordplay/issues/490). Allow curators to add projects to gallery.
- [#491](https://github.com/wordplaydev/wordplay/issues/491). Fixed tutorial content reactivity.

## 0.10.0 2024-06-15

### Added

- [#106](https://github.com/wordplaydev/wordplay/issues/106). Added ability to translate names and text in a program to other supported languages.
- [#484](https://github.com/wordplaydev/wordplay/issues/484). Cleaned up project locales and translations.
- [#485](https://github.com/wordplaydev/wordplay/issues/485). Have runtime respect project locales.

### Changed

- Upgraded to latest versions of Firebase Functions and Firebase Admin.
- Added pull request template

## 0.9.397 2024-06-07

### Fixed

- Prevented palette addition of `Phrase` when `Stage` is already present.
- Corrected Boolean or operator description in tutorials.
- Fixed typo in number tutorial.

## 0.9.396 2024-06-02

### Added

- `Scene` now supports shapes.
- Conflict resolution for duplicate names.
- Fixed `Stage` documentation examples.

### Fixed

- Added clip path to stage rendering.

## 0.9.395 2024-05-18

### Fixed

- Enabled content security policy to enhance security.
- Improved layout of example code output refresh.
- Tidier spacing of project preview lists.
- [#468](https://github.com/wordplaydev/wordplay/issues/468) Fixed example dragging from tutorial dialog.
- [#465](https://github.com/wordplaydev/wordplay/issues/465) Fixed ARIA roles for output.

### Added

- Added `Circle` and regular `Polygon` forms, which can be added to a stage as a background.

## 0.9.394 2024-05-11

### Fixed

- Changed toggle button color to always contrast backgrounds
- Defined foreground of footer to ensure button text is visible.
- Reset stage output when locales change.
- Signficantly reduced memory usage of edit history
- Improved preferred spacing of compound data structures and blocks.
- Faster and more correct and stable preferred spacing algorithm.

## 0.9.393 2024-05-04

### Added

- [#451](https://github.com/wordplaydev/wordplay/issues/451) New project templates.

## 0.9.392 2024-04-29

### Fixed

- [#450](https://github.com/wordplaydev/wordplay/issues/450) Tutorial typos!
- [#444](https://github.com/wordplaydev/wordplay/issues/444) Fixed fullscreen background behavior.
- [#452](https://github.com/wordplaydev/wordplay/issues/452) Fixed aggressive local project persistence causing slowdown.
- Removed `Toggle.svelte` background color when off.
- Restored preferred spacing on `CodeView`.
- Removed padding from `ConceptLinkUI` for better guide typography.
- Included text in whitespace in selection bounding box.
- When deleting program node, also delete its preceding space.
- Remove caret entry direction when selecting parent of caret.
- Only highlight definitions and uses of caret position when inside a token.
- Fixed incorrect placement of caret; it was assuming pretty printing.
- Removed unused font preload.

### Added

- Added description of the parent of the node the cursor is at.

### Changed

- Upgraded to Dexie 4.0.4.

## 0.9.391 2024-04-20

### Changed

- Updated Firebase

## 0.9.39 2024-04-06

### Fixed

- Added emoji variation selectors to `PhraseView` to ensure proper rendering of color emoji on WebKit browsers.
- Empty list values should have an undefined item type, not a never type.
- Fixed types of Webpage stream, should have been number, not none.
- Don't show project footer in tutorial when in non-editable mode.
- [#410](https://github.com/wordplaydev/wordplay/issues/410): Fixed alignment of project preview characters.
- [#420](https://github.com/wordplaydev/wordplay/issues/420): Avoid setting tutorial project name.

### Changed

- Updated Svelte, SvelteKit, and Firebase versions.
- Updated TypeScript to 5.4.

## 0.9.38 2024-03-30

### Fixed

- [#422](https://github.com/wordplaydev/wordplay/issues/422): Improved performance of very long list, set, and map values.
- [#423](https://github.com/wordplaydev/wordplay/issues/423): Improved design of tile expand/collapse.

## 0.9.37 2024-03-16

### Fixed

- [#424](https://github.com/wordplaydev/wordplay/issues/424): Fixed text to list conversion grapheme segmentation.
- [#425](https://github.com/wordplaydev/wordplay/issues/425): Prevent buttons from capturing keyboard focus on mouse down, in order to keep focus on stage and other components.

## 0.9.36 2024-03-10

### Fixed

- [#405](https://github.com/wordplaydev/wordplay/issues/405): Fixed closures on property binds.
- Fixed rendering of structure values, showing all bound values, not just input values.
- Fixed structure value equality, comparing all bound values in scope, not just first level of scope.

## 0.9.35 2024-03-02

### Fixed

- Moved `Chat` input box above stage output
- Allow paste in `Chat` input box
- Disabled automatic pretty printing.
- Fixed list spread doc example.
- Better unused bind conflict message.
- Narrowed parsing of structure refinements to avoid conflicting with spreads in lists.
- Account for documented expressions in bind recurrence relations.
- More consistently concretize name types in binds.
- [#402](https://github.com/wordplaydev/wordplay/issues/402): Fixed defect in page loading test.
- Check for collisions even when there's no temporal stream, to allow for objects to collide even when not in motion.

## 0.9.34 2024-02-24

### Added

- [#343](https://github.com/wordplaydev/wordplay/issues/343): Improved login feedback.
- [#37](https://github.com/wordplaydev/wordplay/issues/37): Added match, e.g., `number ??? 1: 'one' 2: 'two' 'other'

## 0.9.33 2024-02-19

### Added

- [#256](https://github.com/wordplaydev/wordplay/issues/256): Allow explicit space indicators to be shown or hidden.

## 0.9.32 2024-02-17

### Fixed

- [#382](https://github.com/wordplaydev/wordplay/issues/382): Wait for gallery to be created before redirecting.
- Don't show preview if there are no projects in a gallery.
- Fixed text placeholder error, preventing empty gallery description from being rendered.
- Better feedback on too many login failures
- Added admin script to update user password
- Fixed MIME type on NotoEmoji preload
- More consistent list function names.
- Slightly faster list creation.
- Slightly faster number to list conversion.

## 0.9.31 2024-02-10

### Added

- [#362](https://github.com/wordplaydev/wordplay/issues/362): Added elision syntax to allow temporary removal of code from parsing (e.g., removing `2` from `1 + *2* 3`). Also included a toolbar and keyboard command for quick toggling.
- [#336](https://github.com/wordplaydev/wordplay/issues/336): Added basic syntax error resolution suggestions.

### Fixed

- English tutorial typos
- Maximum project name length in footer.
- Maximum toggle length.
- Anchor dialog close buttons when scrolling.
- Added missing Source input documentation.
- Restored duplicate name warnings.
- Incorrectly formatted inline code in tutorial.
- Fixed font on non-emoji toolbar symbol icons.
- Remove confusing automatically inserted placeholder at end of programs.
- [#374](https://github.com/wordplaydev/wordplay/issues/374): Allow deletion of selected placeholder.
- [#381](https://github.com/wordplaydev/wordplay/issues/381): Removed confusing line break insertion behavior.

## 0.9.3 2024-02-03

### Added

- [#23](https://github.com/wordplaydev/wordplay/issues/23): Source file output with `Source()`, allowing data persistence in a project.
- Added support for page up and page down to navigate to start and end of source
- Line breaks for long literals

### Fixed

- Fixed list literal types in the presence of spreads (e.g., `[:list 2 3]`)
- Fixed end command to go to end of last line.
- Fixed direction of annotation toggle error.

## 0.9.21 2024-01-28

- [#176](https://github.com/wordplaydev/wordplay/issues/176): TextFields can increment and decrement numbers.
- [#364](https://github.com/wordplaydev/wordplay/issues/364): Enabled email enumeration protection.
- [#361](https://github.com/wordplaydev/wordplay/issues/361): Fixed popup dismissal.
- [#359](https://github.com/wordplaydev/wordplay/issues/359): Fixed error in windows build command.
- [#365](https://github.com/wordplaydev/wordplay/issues/365): Enforce number of acts and scenes.

## 0.9.20 2024-01-20

### Added

- [#76](https://github.com/wordplaydev/wordplay/issues/76): Added `Scene`, a new input stream for showing a sequence of optionally interactive output. This will make it easier to tell typographic stories.
- [#130](https://github.com/wordplaydev/wordplay/issues/130): Added `Phrase.aura` to allow for text shadows on text.
- Defined `[].shuffled()` for quick and easy list randomization.
- Added ability to expand and collapse the editor annotations.

### Fixed

- [#340](https://github.com/wordplaydev/wordplay/issues/340): Resolved nested formatting logic for text formatting.
- Filled source output preview background with error color on exception values.
- Distinguished color of docs and text.
- Fixed rendering of example output in docs.

## 0.9.16 2024-01-13

### Fixed

- [#340](https://github.com/wordplaydev/wordplay/issues/340): Corrected partial formatting edge case
- [#341](https://github.com/wordplaydev/wordplay/issues/341): Fixed key overrides in MapLiteral.
- [#342](https://github.com/wordplaydev/wordplay/issues/342): Fixed broken collaborator sharing button.

### Changed

- Upgraded to SvelteKit 2.32.
- Upgraded to Vite 5.0.11
- Upgraded to Firebase functions 4.6
- Upgraded to Pitchy 4.1
- Upgraded types: matter-js, node, uuid

## 0.9.15 2023-12-22

### Added

- [#310](https://github.com/wordplaydev/wordplay/issues/310): Added a new feature for detecting PII in projects and generating conflicts for them, as well as resolutions for marking text as not PII. When PII conflicts are present, projects aren't saved.
- [#48](https://github.com/wordplaydev/wordplay/issues/48): Added basic support for conflict resolutions.
- [#209](https://github.com/wordplaydev/wordplay/issues/209): Redesigned adjust buttons for literals.
- [#276](https://github.com/wordplaydev/wordplay/issues/276): Added weight, italic, and underline formatting controls in palette.
- Added explanations of save errors.
- Require ARIA-label for checkboxes.

### Fixed

- Subconcepts are now scrolled to properly when selected via a concept link.

### Changed

- Improved error messages and converage of basis unit tests for conflicts.

## 0.9.14 2023-12-21

### Fixed

- Toggle buttons no longer trigger twice on keyboard activation.

### Changed

- [#305](https://github.com/wordplaydev/wordplay/issues/305): Redesigned auth for simplicity, removing email login option. Punted on account recovery.
- [#303](https://github.com/wordplaydev/wordplay/issues/303): Require password on account deletion and password change.

## 0.9.13 2023-12-20

### Added

- [#191](https://github.com/wordplaydev/wordplay/issues/191): Added moderation progess to moderation page.
- [#235](https://github.com/wordplaydev/wordplay/issues/235): Pre-render static pages for speed and SEO.
- [#269](https://github.com/wordplaydev/wordplay/issues/269): Added type guard support for list and map access.
- [#257](https://github.com/wordplaydev/wordplay/issues/257): Infer structure input types from evaluate.

### Changed

- [#220](https://github.com/wordplaydev/wordplay/issues/220): Less confusing use of writing mode. Removed global setting, changed editor to always be horizontal top to bottom, but respect priority script's horizontal direction, and added direction as attribute of individual outputs, groups, and stages.

### Fixed

- [#251](https://github.com/wordplaydev/wordplay/issues/251): Consistent tutorial lesson drop down appearance.
- [#330](https://github.com/wordplaydev/wordplay/issues/330): Labeled drop downs.
- [#314](https://github.com/wordplaydev/wordplay/issues/314): Removed low opacity footer on fullscreen for accessibility.

### Changed

- [#313](https://github.com/wordplaydev/wordplay/issues/313): Upgraded to SvelteKit 2, Vite 5, tsx 4.7.0, and related dependencies.

## 0.9.12

### Changed

- Redesigned editor annotations to avoid obscuring on hovers.
- Generalized mechanisms for time-based reactions in evaluations.
- Guaranteee re-render on font load.

### Changed

- Updated minor versions of Playwrite, ESLint, Jester, tsx, and Firebase
- Upgraded to Prettier 3

## 0.9.11

### Added

- Added support for ø coalescing (e.g., a ?? 1) [#36](https://github.com/wordplaydev/wordplay/issues/36).

### Fixed

- Corrected caret position layout in the presence of tabs.
- Added tab insertion command and shortcut.
- Fixed closures on block evaluations [#270](https://github.com/wordplaydev/wordplay/issues/270).

## 0.9.1

This version includes many other changes made prior to this log was created.

### Added

- New change password form on profile.

### Changed

- Improved design of username and password login [#272](https://github.com/wordplaydev/wordplay/issues/272), [#273](https://github.com/wordplaydev/wordplay/issues/273)
- Converted blocks toggle to a keyboard/mouse switch.
- Explicit switch control over localization of editor, instead of automatic.

### Fixed

- Corrected English list literal tutorial, which didn't explain wraparound behavior of indices.
- Decoded getWebpage response as JSON-encoded string, fixing HTML parsing and querying.
- Keep editor caret displayed after losing focus to preserve menu location.
- Fixed caret position of multilingual name renames.

## 0.9.0

Initial beta release.
