# Change Log

We'll note all notable changes in this file, including bug fixes, enhancements, and all closed issues.
Dates are in `YYYY-MM-DD` format and versions are in [semantic versioning](http://semver.org/) format.
These notes are publicly posted in [production](https://wordplay.dev/updates), so we write them to an audience of teachers and youth.

## 0.37.0 - 2026-09-12

### Added

- 🤝 We added kits, which let you publish code you want to share with other people. Add ↑ in front of values or functions, then publish. (#8)
- 📖 You can now find and search published kits in the [Guide](https://wordplay.dev/guide), and add one to your program by borrowing it with ↓. (#8)
- 🤝 Wordplay now comes with three kits you can borrow — alphabets, instruments, and songs — so you don't have to type out letters, instrument faces, or tunes yourself. (#8)
- 🌐 The three kits that come with Wordplay are written in every language we support, so their names and their writing read in yours. (#8)
- 🔢 Numbers can now do three things you used to write out by hand: `limit` keeps a number between a low and a high, `toward` moves a number part of the way to another one, and `rescale` turns a number in one range into the matching number in another.
- 🔢 A list of numbers can now tell you its `sum` and its `average`, so you don't have to add them up yourself.

### Fixed

- 🎨 A heading inside a tabbed panel, like the ones in Settings, now sits closer to the part it names instead of drifting up toward the section above it.
- 🚩 We fixed asking for a character in a gallery to be reviewed, which always failed before. (#1372)
- 🌐 Translating a program no longer renames a name in one place but not the others, which used to break the program. (#1368)
- 🔑 If we can't tell that your browser is a real one, which can happen on school networks, we now say so instead of asking you to try again. (#1378)
- 🐛 The login page no longer says it sent you a sign-in link when it couldn't. (#1378)

## 0.36.0 - 2026-09-09

### Added

- 🎬 A @Scene can now repeat, start over, hold still, wait for you after every part, and step or jump to any part of itself, so you can make a game that asks again after every round or a slide show you click through. (#547)
- 🎬 We added @Spotlight, which tells you which part of a @Scene is showing, how many parts there are, how many times it has come around, and whether it is waiting for someone. (#547)
- 🧱 A @Group can now hold a @Shape, so you can stack a circle with your words, or put a @Scene inside a layout. (#547)
- 📐 A @Shape now lines up with the @Stack, @Row, or @Grid it's in, instead of sitting wherever its own corners happened to be, and anything inside a @Grid can now be nearer or farther away. (#547)
- 📖 We added a how-to to the [Guide](https://wordplay.dev/guide) for repeating a round of a game. (#547)

## 0.35.1 - 2026-09-08

### Added

- 🌐 You can now show your code in two views side by side, each in its own language, so you can point at something in one and find it in the other. (#534)

### Changed

- 🎨 A name or symbol the editor is showing differently from what you typed now sits in a small box, so you can tell it will change back when your cursor moves in. (#534)
- 🌐 When you show your code in a language, built-in names like @Phrase now change to that language too, even if you haven't added it to your project. (#534)
- 🌐 When you translate, the language you pick is now only for writing you didn't mark with a language, since anything you marked already says what language it's in. (#653)

### Fixed

- 🌐 Translating a project now translates all of it, including names and text you marked with another language, which used to be skipped without saying so. (#653)

## 0.35.0 - 2026-09-05

### Added

- 🔑 You can now make an account that signs in with a link we email you, so there's no password to forget. We ask your birthday and where you live to check your age, and we don't keep either one. (#628)
- 🔑 You can now switch how you sign in from your profile, swapping a password for emailed links or the other way; your username stays the same. (#628)
- 🏫 We added a section to the [About](https://wordplay.dev/about) page for schools, saying what we promise about privacy and accessibility, with a link to email us. (#697)
- 🔢 You can now write a range of numbers like `1‥10`; check if a number is inside with `∋`, turn it into a list, or use it in a `???`. (#398)
- ✍️ Type two dots to get the range symbol `‥`, and a third to turn it into the stream symbol `…`. So `1..10` gives you a range and `1...10` still gives you a reaction. You can also pick `‥` from the symbols under the editor. (#398)
- 🤝 You can now share your [characters](https://wordplay.dev/characters) in a gallery, where everyone can see them, make their own version, or copy a name to use. (#822)
- ✍️ Wherever you write formatted text, the editor now shows it the way it will look; press the 👁 button to see the symbols. (#1307)
- ✍️ Click to place the cursor, double-click for a word, triple-click for a paragraph, and hold Option or Alt with an arrow to jump word by word. Pressing Enter after a bullet starts the next one. (#1307)
- 🔒 You can now ask for a character shared in a gallery to be reviewed by the gallery's curators and Wordplay's moderators. (#1236)
- 🌐 The [Updates](https://wordplay.dev/updates) page is now in your own language, with anything not translated yet still in English. (#1164)

### Changed

- 🔒 Everyone now has a username, even people who sign in with email, and Wordplay never shows anyone's email address to anybody else. (#628)
- 🔒 We now check that requests come from the real Wordplay, so nobody can make thousands of accounts; you won't see anything or solve any puzzles. (#1299)
- 🎨 We tidied a gallery's page: projects and characters each have a heading with an add button, and the join, view, and delete settings now sit in tabs at the bottom. (#822)
- 📝 We grouped the buttons above the formatted text editor into undo/redo, bold and italic, and code examples. The example buttons only appear when your cursor is inside an example. (#1307)
- 🎨 A character's share button now says "share", like a project's does, and opens tabs for who can see it, who can help make it, and which gallery it's in. (#822)

### Fixed

- ✍️ Turning on wrapping in the editor now really wraps long lines instead of letting them run off the side.
- 📖 We fixed a how-to in the [Guide](https://wordplay.dev/guide) that stopped halfway through, so the rest now shows.
- 🐛 Tooltips now leave a space before the keyboard shortcut, so a button reads "bold (⌘B)" instead of "bold(⌘B)".
- 🗣️ We fixed screen readers reading the wrong letter after an emoji in your code. (#1329)
- 🚦 If you write `1…10` when you meant a range, Wordplay now offers to swap the three dots for two, but only when both sides are numbers. (#398)
- 🚦 We fixed asking whether a value is one exact number or word, like whether `5` is a `5` or matches a list of choices like `1|2|3`.
- 🐛 We fixed Wordplay freezing when you turned an endless number into a list; asking `∞` for a list now gives you an empty one.
- ✍️ If you name a character something you already used, Wordplay keeps the old name so two characters cannot share one, and your drawing still saves while you work.
- ✍️ If you type spaces in a character's name, Wordplay now joins the words — "My Cool Character" becomes "MyCoolCharacter".
- 🐛 Custom characters now show up when you're not signed in, so a public project that uses one looks right to everyone. (#742)
- 🐛 We fixed a cut-off sentence in the sharing box so it now says who reviews what you share, after the rules.
- 🎨 We fixed the space around a list of rules in the sharing box, which used to leave more room after the list than before it.
- 🐛 A gallery's page now says the gallery's name in your browser tab.
- 🤝 When a curator opens a gallery's how-tos to people in their other galleries, those people can now read, react, and chat. (#907)
- 🔒 A how-to you're still writing now stays yours until you post it, so others can't read, move, or react to it. (#907)
- 💾 Bookmarks and reactions on a how-to now save when you're invited to a gallery's how-tos or make things there. (#907)
- 🔒 We fixed a hole that let anyone with an account change any how-to, even ones in galleries they had nothing to do with. (#907)
- 🐛 We fixed every link in our update notes, which all pointed at a broken address.
- 🎨 The Added and Removed labels on the Updates page are now darker, so the white text on them is easier to read.
- 🗣️ The Updates page now says its name in your browser tab and to screen readers.
- 📖 We fixed an old update note that stopped halfway through, because a symbol in it ended the text early.

## 0.34.1 - 2026-09-02

### Added

- 🌐 If you read a language written down the page — like Chinese, Japanese, Korean, or Mongolian — you can now set Wordplay to read that way too. The lessons and each thing the guide explains run top to bottom. Buttons, menus, and lists stay as they were. (#1203)
- 🌐 Code written entirely in a language that goes down the page can now show that way with a button above the editor; it only appears for such code. (#1203)
- 🧩 You can now choose more than one piece of code at once: hold shift and press an arrow, then delete, cut, copy, or group them. (#177)
- 🖱️ You can now drag everything you've chosen at once: press inside your choice and drag, and it all moves together. (#177)
- 📖 We added _stream_ to the glossary, so the word can tell you what it means wherever Wordplay uses it. (#960)

### Changed

- 🌐 The writing layout setting now only appears for languages truly written down the page, and only offers the direction that language uses. (#220, #1203)
- 🎨 What your program shows on stage now follows the project's language, not the viewer's settings, so a shared project looks the same for everyone. (#1203)
- ✍️ How your code is laid out now follows the code itself, not the language you read the app in. (#1203)
- ✍️ Pressing up on the first line now moves the cursor to the very start of your program, and down on the last line moves it to the very end.
- 🧩 In blocks mode, holding shift and pressing up or down now chooses the code your cursor is in. Before, it scrolled the page and said the key did nothing.
- 📖 Words like _value_, _expression_, and _stream_ now tell you what they mean the first time each [lesson](https://wordplay.dev/learn) or help page uses them. (#960)

### Fixed

- ✍️ We fixed up and down doing nothing: in blocks mode a cursor at the end of a program can now move, or say why it can't.
- ✍️ Pressing up or down inside a long, wrapped line now moves the cursor a row, as it should.
- 🐛 Pressing Escape to choose the code around your cursor sometimes chose the piece before it instead of the one you were in.
- 🐛 Speech bubbles now flip around for right to left languages like Arabic and Hebrew. (#1203)

## 0.34.0 - 2026-09-01

### Added

- 💬 You can now reply to one message; replies gather into a thread, and the count turns gold when some are new to you. (#821)
- 👍 You can now react to a message with an emoji: eight common ones are one press away, and you can search for any other. (#821)
- 📎 You can now say which code you're talking about. Put your cursor in the code, press the 📎 beside the message box, and your message carries that line. You can send just the link, with no words at all. (#820)
- 👥 Code somebody talked about gets a 👥 in the margin; press it to read what was said, and the link follows your program. (#820)
- 📐 You can now pick which corner of the screen the stage sits in: top left, top right, bottom left, or bottom right. The guide, palette, and collaborate tiles move to match, and your code stays in the middle. (#925)
- 🌐 We translated the built-in [gallery](https://wordplay.dev/galleries) examples into Spanish and Chinese, and each opens in the languages you've chosen. (#1310)

### Changed

- 🤝 The collaborate tile's list of people now fills the tile, and the box for adding someone waits behind a **+** until you ask for it.
- ✍️ The message box no longer offers the three markup buttons (⭐, 🪲, 👀), since those are for writing documentation.
- 🧱 The stage now sits in the same corner whatever the shape of your window. (#925)
- 🧹 The layout button at the bottom of a project now shows one icon instead of two, and its tip still says which layout it picked.

### Fixed

- 🐛 A header you're working in is no longer dimmed, so the focus outline is easy to see.
- 🐛 The settings no longer slide sideways on a narrow window; rows of buttons now wrap onto a second line.
- 🎨 The layout buttons in the settings are all black and white now, so they match.
- 🐛 We fixed a bug where a project written in Serbian compared things the wrong way around: Wordplay had the symbol for "is not equal" written as "is equal", so programs quietly did the opposite of what they said. (#1310)
- 🌐 We fixed bugs that could break a program rewritten in another language: a word the program checks for stays as it is everywhere it appears, symbols like ~ stay symbols, a name never turns into a word the language already uses for something else, and an input keeps working when its name matches one of those words. (#1310)
- 🤝 We fixed a bug where remixing a project named in several languages garbled its name.
- 🐛 Presses now pass through the label naming the code you've chosen, so you can press or drag the code it names. (#177)

## 0.33.1 - 2026-08-30

### Added

- 🧭 The [tutorial](https://wordplay.dev/learn) now offers a tour that points at each control for the editor, stage, palette, guide, or timeline. You can skip a tour, and one you've taken won't ask again. (#984)

### Changed

- 📝 We rewrote the lessons about parts of the screen to say what the editor and stage _are_ and explain an exception more plainly. (#984)
- 📖 We added _editor_ and _stage_ to the glossary, so a mention of either word anywhere in Wordplay can tell you what it means. (#984)

### Fixed

- 🐛 The tutorial's two pointers to buttons that no longer exist now point at controls that are really there. (#984)
- 🚦 When your cursor is inside a placeholder, we no longer say it's "of type any". (#984)

## 0.33.0 - 2026-08-29

### Added

- 🌐 We added support for Persian (`fa-AF`)! (#1229).
- 🔔 You now hear what happens after something is reported: we tell you the decision and which rules it broke, and we never say who reported it. (#938)
- 🤝 Every place where you share something now tells you who can review it — including when the answer is nobody. (#938)
- ⚑ You can now report a project in a private gallery to that gallery's curators. (#938)
- 💬 When someone reviews a message, they can now say which rules it broke and write a note that comes to you with the decision. (#938)

### Changed

- 🔔 Your notifications now last: they stay after you reload, follow you to other devices, and stay cleared once you clear them. (#938)
- 🤝 Who reviews what you share now follows who can see it, and the [rights page](https://wordplay.dev/rights) explains all of it. (#938)
- 🔒 We now fully hide a reported message while someone reviews it, instead of just hiding it on screen. (#938)
- 🚩 Reporting a message hides it only once, so no one can report it again and again to keep someone quiet. (#938)
- 🤝 Reported messages now wait on the moderation page with everything else to review, and your notifications take you there. (#938)
- 🤝 The collaborate tile now lists everyone who can reach your project in one table, with a menu to set each person to collaborate, comment, view, or take over as owner.
- 💬 A chat now starts by talking: the message box is ready when you open the tile, and sending your first message makes the chat.
- ✍️ While you write a message, the list of people shrinks to a row of everyone who can read what you say, so the conversation gets the whole tile.
- 🌐 The "translate messages into" and "I'm writing in" menus now sit together on one line above the message box, without the search beside each one.
- 🤝 Every place Wordplay lists people now uses the same table, so adding and removing works the same everywhere, and it puts two or more people on a row to shorten long lists.

### Fixed

- 🔒 Your notifications no longer stay after you sign out. On a shared computer, the next person could see warnings meant for you. (#938)
- 🔔 Turning off how-to notifications no longer clears all your other notifications too. (#938)
- 🔔 You now hear about messages that arrived while you were away, not just ones that came in while the page was open. (#938)
- 🔔 Several reported messages in one project now show as several notifications instead of one that never went away. (#938)
- 🐛 The report flag on a chat message no longer opens the report box for every message at once. (#938)
- 🐛 Reporting the same thing twice no longer makes two reports. (#938)
- 🔒 Only the person who owns a project can delete its chat now, instead of anyone in the chat. (#938)
- 🐛 Everyone now has one privilege, so a person no longer shows up twice in the collaborate tile, and an old project fixes itself the first time you change anything.
- 🐛 When you type a name we can't use, the message saying why now floats above everything, right under the box, instead of being cut off or hidden behind a button.
- 🗣️ Screen readers now read out why a name was rejected in boxes that hold several lines of writing.

## 0.32.1 - 2026-08-28

### Added

- 🔍 You can now search the [galleries](https://wordplay.dev/galleries): type a word to see matching galleries, example projects, and projects from shared galleries. (#299)
- 🤝 Listing your gallery is now a request a moderator reviews; your gallery page shows whether it's waiting, listed, or turned down, and you get a notice when that changes. (#1311)
- 📚 Six examples that weren't in any gallery are now in one, so you can find them: Adobo Recipe, Color Show, Laughing, Layouts, Mumble, and Wild Transforms.
- 🌐 You can now add the other spellings of a glossary word so a link like `@parameters` holds the whole word, and translators get a new Glossary tab to add and remove them. (#1244)
- 📖 We made it easier to fix a glossary word or what it means: you can now change it right where you see it in the [Guide](https://wordplay.dev/guide), instead of finding it in a long list of text. (#1244)
- 🌐 If you help translate Wordplay, you can now fix the notes the editor shows about problems in your code — both the short name of the problem and the sentence explaining it — right where you read them, instead of finding them in a long list. The parts the sentence fills in for itself, like the name of the thing that's wrong, stay put while you edit, and the note reads normally again once you save. (#1275)
- 📖 In the same way, you can now fix what the editor says a piece of code is, and the help text for anything built in, wherever those show up. (#1275)

### Changed

- 📖 How-tos shared in a gallery now live in the [Guide](https://wordplay.dev/guide) with the others, grouped under the gallery that shared them. (#1277)
- 🤝 The galleries page now shows public galleries in a new order each visit, and says so when none are listed yet. (#1311)

### Fixed

- 🌐 In localization mode, an edit button now appears only where there is really something to change. (#1275)
- 🌙 In dark mode, the highlighted word in a search result is now dark enough to read on its yellow background.
- 🌐 We put the Python, JavaScript, and Java samples in the [tutorial](https://wordplay.dev/learn) back to how they are written, in every language.
- 📖 About 50 tutorial lines told you to try something without showing it — a sentence about using `+` with no `+` in it. We put the missing examples back in Portuguese, Spanish, Hindi, and Chinese.
- 📖 In the Spanish and Chinese tutorials, we removed lines that some characters said twice.
- 🌐 The examples that teach language tags had lost their tags in every language, showing `'hello'` where they meant `'hello'/en`. They teach what they're for again, and text that is meant to stay in another language is no longer translated away.
- 📖 The how-tos for drawing music, tracking a game, and the video grid are now up to date in every language.
- 🌐 We fixed names that had been translated into the wrong word, so you can type what the [Guide](https://wordplay.dev/guide) shows. In eleven languages the word for the kind of thing a list holds had become the word for being kind, in Polish a `Set` was the verb for arranging things, and five Hebrew names carried marks nobody types. (#1324)

## 0.32.0 - 2026-08-26

### Added

- 🗨️ Give a @Phrase a `bubble` and it speaks in a speech bubble pointing at it; add words, a @Say to speak aloud, or a @Bubble to pick a color or make it a thought. (#75)
- 🗨️ A bubble finds its own place above or beside whoever is speaking, and your stage makes room so it is never off screen. (#75)
- 🗨️ We added a new example called Dialog to the [galleries](https://wordplay.dev/galleries), where two letters talk about how strange it is that letters talk. (#75)
- 📐 A @Row can now line its content up on the baseline, the line that letters sit on, so a short `a` and a tall `b` read as one line instead of two. Choose `_` for the row's alignment.
- 🔠 Every font now describes how it looks, with 12 words for letter shape and 13 for feel, translated into every language Wordplay speaks. (#298)
- 📐 Drag a thing near another and it snaps to its edges, middle, or baseline, with a line showing the match; it snaps to the grid when on, and Alt or Option lets you place it anywhere. (#117)
- 📐 Arrow keys move whatever you picked, and holding shift jumps it to the next thing it can line up with, with Wordplay saying where it landed. (#117)
- 🧱 The palette now has a row of + buttons at the top to add a phrase, rectangle, circle, many-sided shape, line, music, or speech to your stage.
- 🧱 A new thing lands below what's on your stage and Wordplay picks it so you can change it right away; if you picked something first, it goes beside it.
- 🔳 Pick two or more things on your stage and press 🔳 to collect them into a @Group. When it can't, the button says why. (#119)
- 🔣 You can now make a circle or a many-sided shape, not just a rectangle, and type each shape as `▭`, `●`, or `⬢`.
- ✏️ You can now draw on your stage: press the pencil, then drag for a line or click for each bend, use arrow keys and Enter to draw without a mouse, and Escape to finish. (#167)
- ✏️ The pencil turns off once you've drawn a line so you won't start another by accident; if your program is empty, it gives you a @Stage to draw on. (#167)
- 📐 A new shape, @Path, draws a line through a list of places, and you can type it as `╱`. Ask for `closed` to join the last place back to the first, `smooth` to curve through your places instead of turning at them, and `thickness` to say how thick to draw it. It takes a plain list of places, so anything that makes places can draw one — including @Contour, which traces the outline of letters. (#167)
- 📐 Pick a line you drew and drag its handles or use arrow keys to bend it, press Enter to add a place halfway, and Delete to remove one. (#167)
- 🧲 A @Path on your @Stage now stops things by its real shape, so you can draw a hill or valley and watch things roll into it. (#167)
- 🔠 Give a shape `glyphs` and Wordplay writes that text along its edge over and over, so words can run around a circle or a line can be drawn out of letters. (#167)
- 🎨 Shapes now have `filled` and `stroked`, so you can have just an outline, or neither — which is how you make a wall that stops things without being seen.
- 🌐 You can now write a language tag with the language's name, not just its code: `'hola'/Español`, `'hola'/Spanish`, and `'hola'/es` all mean the same thing, and so do `/es-México` and `/es-MX`. Capitals and accents don't matter, so `/espanol` works too. (#1220)
- 🚦 Wordplay now tells you when it doesn't know the region in a language tag, the way it already did for the language. Before, a misspelled one like `/en-Merica` quietly meant nothing. (#1220)
- 💡 You can now finish a language tag by typing part of one. Type `/esp` and pick `/español`, `/span` and pick `/Spanish`, or `/en-U` and pick `/en-US` — and once you've typed something, every language and region is offered, not just the ones Wordplay speaks. (#1220)

### Changed

- 🗨️ Three examples now use speech bubbles instead of words placed by hand: the map that tells you about a place when you bump into it, the face that says your mood, and the story Pears. (#75)
- 📐 When your program shows more than one thing, they now go exactly where you put them. Wordplay used to quietly gather them into a @Group and stack them, which threw away the up-and-down part of every place you wrote and moved the side-to-side part too. Things with no place of their own now sit on top of each other in the middle, so give them a place — or write a @Group yourself if stacking is what you wanted.
- 🌐 The [language chooser](https://wordplay.dev/) now writes each region in its own language, so you'll see "México" and "日本"; you can still search for either name. (#1220)
- 💡 When you pick a language tag from the menu, it now names the language, so `/es` reads as "español" and `/es-MX` as "español (México)". (#1220)
- 🌐 After you type a language, we now offer the places where people speak it — `/en` offers `-US`, `-GB`, and `-CA`. Adding a second language is still there, lower down. (#1220)

### Fixed

- 🔠 The font chooser now reads markers as "no light, bold, extra, italic" and reads supported writing as "Greek", while still showing the symbols and letters. (#298)
- 🖱️ We fixed clicks on your stage that used to select nothing, giving a blue outline but no handles and no arrow-key movement.
- 🔍 Your stage now holds still while you drag something and fits your work again when you let go; restart your program to frame everything fresh.
- 🗣️ Screen readers now say "group" or the shape's word instead of reading its symbol, like "white square button".
- 🐛 When a language tag names the same region twice, fixing it now removes only the repeat, not your other regions. (#1220)
- 💡 The menu now helps you write a language tag: `'hi'/` offers languages, `'hi'/en` offers regions, and `'hi'/en-U` finishes into `/en-US`. (#1220)
- ✍️ Adding something to your program used to pull your project's description up onto the first line of your code.
- 🎨 Picking a @Say now lets you edit what it says in the palette, like anything else.
- 🐛 A small shape's outline, its turn and resize handles, and the shape itself now line up instead of sitting in different places.
- 🎨 We fixed a circle or many-sided shape used as your stage's `frame` cutting out the wrong part of the stage.

## 0.31.0 - 2026-08-25

### Added

- 🔊 Turn on evaluation cues in settings and Wordplay makes a short sound each time your program runs, with a different sound per input. The time slider tour explains them. (#537)
- 🧲 Turn on collision cues and you can hear things bump on your stage: a harder hit is louder, and several things landing at once sound like several things.
- 🎞️ Turn on animation cues and you can hear an animation: turning changes pitch, moving shifts the sound side to side, and fading out grows quieter. A repeating animation plays the same tune each time.
- 🔊 A `@Pose` can now carry a `@Music` that plays the moment that pose happens, whether you enter with it or reach it inside a `@Sequence`. (#22)

### Changed

- 🧭 On a small screen, your code, stage, and other windows now have their own row above the project name, so switching is one tap, and tapping the window you're viewing keeps it.
- 🔤 `sorted` can now sort by a word, not just a number, so you can sort things by a name; emoji now sort by what they are, so hearts sit together. (#1322)

### Fixed

- 🎨 A button that's turned on now looks pushed in: it sinks down and darkens, instead of moving up or looking lit in dark mode.
- 🔤 Words now sort in alphabetical order like a dictionary, so "amy" sits near "Amy" no matter the case. (#1322)
- 🐛 We fixed a crash that could happen when you added a new input like `Speech()` above one you already had.

## 0.30.1 - 2026-08-24

### Added

- 🔣 You can now choose whether an emoji you add is in color or black and white, and Wordplay keeps your choice.
- 📋 You can now select and copy the text your program shows, even while it plays, on anything that isn't a stage.
- 🔊 The notes your music plays now light up in your code, so each number in a melody glows when its turn comes.
- 💡 The code menu can now build much more: take an item from a list or map, change a number's kind with `→`, ask with `???`, look back at a stream with `←`, change part of a structure, and update a table.
- 🔢 You can now write numbers in Roman, Han, Thai, Bengali, Devanagari, Gujarati, Gurmukhi, Kannada, Tamil, and Telugu numerals, and in base 2 and base 16. Pick a digit, then add more before, inside, or after it to build a bigger number.
- 🌙 Your projects can now go dark with the rest of Wordplay, keeping each color's hue and spacing; already-dark projects stay as they are, and you can turn this off in settings. (#65)

### Changed

- 📋 Selecting all text now picks only real text, not buttons, tab names, or footer links.
- 💡 The menu now groups units by what they measure, so `km` is under Length, and plain number choices come first.

### Fixed

- 💡 Ready-made things like `Sequence.sway()` and `Color.random()` now show up when you type a dot after their name.
- 💡 We fixed the menu offering code that couldn't work, like `a()` after `a.` instead of `a.📏()`, and after a `+` it offered things that only work on the number before it.
- 🧩 Choosing your whole program now offers to add something, instead of showing an empty menu.
- 💡 Typing a letter in the menu skipped the very first choice, so that one could never be picked that way.
- 🔍 We fixed the search box in the emoji and symbol chooser, which used to lose your place after the first letter.
- ✍️ We fixed how chosen code with an emoji looks, so it now shows a highlight instead of none.
- 📖 Markup and type variable now have their own pages in the [Guide](https://wordplay.dev/guide), and the markup page shows an example you can try.
- 🌐 The word markup now means formatted text with bold words and links in every language, not the money kind.
- ✍️ We fixed an extra space that crept in before a linked word in code, so `a @Phrase` no longer looks like `a  @Phrase`.
- 🎞️ We fixed which code lights up while something on stage moves, including ready-made motions like `Sequence.sway()`. (#543)
- 🎨 A project with a dark background now draws its outlines and edges in colors that match, so they are easier to see.

## 0.30.0 - 2026-08-22

### Added

- 🔠 Text can now take a piece of itself with `subsequence`, find where another text first shows up with `index`, swap every copy of one text for another with `replace`, drop the blank space at its ends with `trim`, and turn itself backwards with `reverse`.
- 🔣 Formatted text can now become a list of its symbols, or a number, the same way plain text can. (#1190)
- 🔢 You can now write `!#`, the not-a-number value, in your own code. Wordplay always knew how to make one — turning text like `'hi'` into a number gives you one — but writing it yourself was marked as a mistake.
- 🎭 Our [home page](https://wordplay.dev/) now has a stage where nine tiny programs play, each with its code beside it. (#921)
- 🧲 @Output can now pull other @Output like a magnet with `pull`, or push away with a negative value; see the new Orbits example in the [galleries](https://wordplay.dev/galleries). (#20)
- 💨 The @Stage now has `air`, which sets how quickly moving @Output slows down: 1 is normal and 0 is outer space. (#20)
- ✍️ You can now fix a path after you draw it: pick one in the [character](https://wordplay.dev/characters) editor, press enter, and move, add, or delete its points. (#667)
- 📐 A path's straight lines can now bend: choose a point, press curve to add a handle, and press delete on it to make the line straight again. (#774)
- 🗣️ The character editor now tells a screen reader what happened when you move, draw, erase, finish, delete, undo, copy, paste, reorder, flip, or change a point. (#666)
- 🔣 You can now add a letter, symbol, or emoji to a [character](https://wordplay.dev/characters) as pixels you recolor, or as an outline you resize and turn. (#924)
- 🖼️ You can now add an image to a character; pick the square you want and we shrink it to fit the grid, and it never leaves your device. (#739)
- 🖌️ The pixel brush and the eraser now have a size, so you can cover more than one square at a time instead of erasing square by square. (#898)
- 📏 Numbers can now change between more than 200 units with `→`, including temperature, volume, angles, area, speed, pressure, energy, power, electricity, frequency, brightness, and storage. (#363)
- 📐 An angle can now become radians, like `45° → #rad`, and `sin`, `cos`, and `tan` all count in radians. (#363)
- 🥤 Cooking and liquid measures work too, but you must say whose: `usgal` or `ukgal`, never a plain `gal`; `tsp`, `tbsp`, and `cup` also work. (#363)
- 🔢 `⊤` and `⊥` can now become numbers with `→ #`, giving 1 and 0, making it easier to count how many things are true. (#363)
- 🗂️ You can now put projects in folders on your [projects page](https://wordplay.dev/projects) by dragging or using the arrow keys. Deleting a folder archives everything inside, so nothing is lost. (#831)
- 👑 You can give project ownership to a collaborator by pressing the crown next to their name; you stay on and can keep editing. (#189)
- ⚑ You can now report a public project that breaks the rules using the flag on the stage; only moderators can see what was reported. (#193)
- 🔒 If your public content breaks the rules, you now get a warning in your notifications. After three, you can share with chosen people but no longer make anything public; the [rights page](https://wordplay.dev/rights) explains it. (#193)
- 🔬 Each project now has a Research setting, off unless you turn it on, that lets us show it as an example without your name or anything that says it's yours. (#922)
- 📖 Every example in the [Guide](https://wordplay.dev/guide) now has a Test it button that opens an editable copy in a new window, kept on your device with a link back. (#1044)
- 📧 You can now write an email address in a doc or a how-to and it becomes a link that opens a message.
- 💾 Settings that follow your account now show a cloud that says "Saved across devices"; signed out, the cloud is grey and tells you what signing in would do. (#231)

### Changed

- 🔣 Counting the symbols in text now counts what you see. A family emoji like 👨‍👩‍👧 is drawn from several pieces, and `length` used to call it five symbols instead of one.
- 🧹 The list functions `without` and `withoutAll` did exactly the same thing under two names, and `without` said it removed only the first copy when it never did. They're one function now, all four names still work, and it removes every copy.
- 🔢 Two not-a-number values are now equal, so `!# = !#` is true.
- 📐 On a phone, the character editor is now one column: the character, then the commands you can use, then the colors.
- 🔣 Making a copy of a character now uses the same symbol as remixing a project, `⧉`.
- 🎨 The saved message at the bottom of the page now shows a cloud instead of a globe. (#231)
- 💡 Auto-complete now says what each unit means, so picking `km` shows "kilometers" in each language you chose. (#890)
- 🛠️ We updated internal tooling.

### Fixed

- 🌐 Explanations of built-in things, like `#km → #m`, now show in the language you chose, not the one a project was written in.
- 🔗 A project with no name now says it is untitled in the browser tab instead of showing "Wordplay - ".
- 🖱️ Two links on a project in your list are now big enough to tap reliably.
- 🧲 Writing a strange number like `!#` or `∞` for the @Stage's `gravity` now uses ordinary gravity instead of freezing things. (#1305)
- 🧲 A @Phrase with @Matter crashed the program the first time it changed size, if it was the only thing physics was moving — like a score that counts up. (#1315)
- 🐛 Formatted text with a language now matches the same text without one, so `` `hi` `` and `` `hi`/en `` are the same.
- 💾 Four settings — font face, line numbers, wrap lines, and space markers — now follow your account instead of staying on one device. (#231)
- 🐛 Reversing a list changed the list you started with, instead of leaving it alone and handing you a new one.
- 🐛 Sorting a list now sends items with a non-number sorting value to the end, and everything else keeps its order.
- 📖 Writing `!#` in a help page quietly erased the rest of the sentence, so we couldn't explain the value at all.
- 🎭 The button that puts a file's output on the stage now shows up whenever your project has more than one file. (#1302)
- 🔊 The bars that show what music is playing now fill the space they're given on a small stage. (#1314)
- 🗣️ Screen readers now read a shape's description on the stage, the way they already read a phrase's. (#1314)
- 🖱️ Pressing space while a program was playing scrolled the page instead of going to the program, so a program that listens for keys could be scrolled out from under you. (#1314)
- 🧩 With blocks turned on, code written inside a sentence — like the `1m` in a help page — became a big box that broke the line around it. Code inside a sentence now stays text, in the [Guide](https://wordplay.dev/guide) and everywhere else. (#1314)
- 📖 A link like `@Time` in a program's documentation is now a real link, the same as in a help page. (#1314)
- 🐛 One undo in the character editor now takes back one change, and a rectangle you finish with the space bar is remembered too. (#1306)
- 🔄 Flipping now mirrors everything you picked — rectangles, ellipses, and pixels — and undo takes it back. (#1306)
- 🎨 Button labels you point at in dark mode are now dark and easy to read everywhere in Wordplay. (#1318)
- 👆 The color swatches are now big enough to tap, and wrap onto more rows instead of getting thinner. (#1318)
- ⌨️ The character editor and other shortcuts now show the right keys for your own computer. (#1318)
- 🖱️ Drawing or erasing with a quick drag now makes a solid line and fills in the gaps. (#898)
- 🐛 Opening a dialog in the character editor threw away your undo history, so you couldn't take back anything you did before it. (#1318)
- 🔣 An emoji added as pixels came out a square too fat, with a faint edge around it. (#739)
- 🐛 `1yr → #day` now gives 365.25 days, the way a year actually works. (#363)
- 🐛 `1kg → #oz` now gives the exact answer instead of a rounded 35.274 ounces. (#363)
- 📐 `sin`, `cos`, and `tan` now give a plain number with no unit, so the sine of `45m` no longer comes back in meters. (#363)

## 0.29.3 - 2026-08-19

### Added

- 🌐 When you translate a project, Wordplay now shows how far it's got and counts the phrases as they're done. (#1276)
- 🌐 When you translate a project, you now choose to add the new language or rewrite your project in it; adding is the default and keeps your code. (#1276)
- 🔒 Translating now has a daily limit, shown as a small bar with how much you have left today and when it fills back up. (#1073)
- 🔍 The stage now shows a small zoom bar with a line for the project's own view; press it to go back to that view. (#1175)
- 🧭 If you zoom or pan until nothing is left on the stage, Wordplay now tells you so and gives you a button to bring everything back. (#1175)
- 🗣️ Screen readers now say the zoom level as you change it, and say when the stage has nothing left on it. (#1175)
- 🔠 You can now make text all uppercase or lowercase, and use `lowercase` on two words to compare them regardless of capitals. (#1301)
- 🌐 Changing text to uppercase or lowercase follows the rules of the language you tagged it with, so Turkish text changes its dotted and dotless `i` the Turkish way. (#1301)

### Changed

- 🧭 The links along the bottom of every page are now underlined and have a bigger area you can tap. (#836)
- 🧭 The link for the part of the site you're on now looks like a tab joined to the page above it, and it keeps showing when you open something inside that part, so you can always tell where you are. (#836)
- 🔑 You now need an account to translate a project, so everyone gets a fair share each day. (#1073)
- 🌐 The languages button now says "translate" when your project uses one language, and counts them once it has more. (#1276)
- 🎨 The translate button now stands out as soon as you pick a language to translate into, so it's easier to find. (#1276)
- 🖱️ Zooming the stage now moves the same amount every time, so one zoom out is undone by exactly one zoom in. (#1175)
- 🔍 How close you can zoom in now depends on what's on the stage, so on most projects you can get much closer without things vanishing. (#1175)
- ⚡ Checking your program for mistakes is faster, especially in long programs and while you're partway through typing something. (#808)

### Fixed

- 💾 The bottom of the page no longer grows taller while your work saves, so nothing above it moves.
- 🧲 @Collision only worked if you gave both things @Matter, and nothing told you so. Now naming two things is all it takes for them to notice each other. @Matter is for how heavy, bouncy, and slippery something is, and for letting a @Motion push it around. (#548)
- 🖱️ The Wordplay logo at the bottom of the page now shows a sign that it is a link when you point at it or move to it with the keyboard. (#836)
- 🌐 In 29 languages, the tutorial pointed at code examples that weren't there — a lesson would say to use `+` but never show it. We put the missing examples back, and Wordplay now checks for this so it can't happen again. (#928)
- 🌐 We redid the whole Arabic tutorial with our current translator, so lessons are easier to follow. (#928)
- 🌐 Translating a project now adds to your words instead of replacing them, and keeps names you wrote with no language, like `speed`. (#1276)
- 🌐 Sentences with an apostrophe, common in French and Italian, now translate instead of staying in the language you started in. (#1276)
- 🐛 Translating sometimes swapped a name for a picture, like turning `Phrase` into 💬, because it grabbed whichever name came first instead of a word. (#1276)
- 🐛 Rewriting a project in a new language only changed part of it: names like `size:` and `duration:` stayed in the old language, so the code ended up in neither one. (#1276)
- 🐛 Translating no longer changes words your program compares against, like `'ArrowLeft'`, or pictures like `'🫀'`; they stay as you wrote them. (#1276)
- 🚦 When you translate, the names of your own structures now change everywhere; if translating would still cause errors, we leave your program alone and say so. (#1276)
- 🐛 A pattern that ignores capital letters for two languages at once, like `Aa/es_en`, stopped your program instead of matching. (#1301)
- 🌐 Patterns that ignore capital letters now work the same on every computer, and only follow a language's own rules when you name one. (#1301)
- 🐛 In the [Guide](https://wordplay.dev/guide), the page for joining two texts together didn't finish loading, so you couldn't read how it works. (#1301)
- 🌐 When a translated name would clash with a built-in word, we now pick a different name so the program still works. (#1276)
- 🐛 A message about failed translating now goes away once translating works again. (#1276)
- 🖱️ The scroll wheel now zooms the stage on mice that scroll line by line. (#1175)
- 🖱️ After scrolling as close as the stage can go, scrolling back out now zooms out right away. (#1175)
- 🎨 The controls above the stage no longer jump in and out of the extra controls menu while you zoom. (#1175)
- 🚦 When you make the same mistake in more than one place, like spelling a name wrong ten times, we now mark every one. (#808)
- 🚦 We removed a wrong warning that told a reaction it had nothing to react to when it watched a stream from a function. (#808)
- 🐛 Reactions inside a function shared by one source and called by another now keep working. (#808)
- 🐛 Writing the word `true` instead of the symbol `⊤` was quietly treated as false. Words like `true` now mean what they say, and `and` and `or` written as words now behave exactly like `&` and `|`. (#1296)
- 🌐 Keyword words like `verdadero` now work the moment you type them in a new project or after adding or removing a language. (#1296)
- 🐛 Writing the word for `~` before a value, like `not ⊤` or `no ⊤` in Spanish, now negates, exactly like the symbol. (#1298)
- 🌐 The words for `and`, `or`, and `not` now work in every language, and our checks keep it that way. (#1298)

## 0.29.2 - 2026-08-16

### Added

- 🌐 If you've never chosen a language, Wordplay now asks which one you'd like on your first visit, in all 30 languages it speaks. (#1256)
- 🌐 You can now read a chat in your own language: pick a language and see everyone's messages translated. You can also say what language you're writing in. (#1214, #771)
- 🔠 We added a new example called Chamber to the [galleries](https://wordplay.dev/galleries), where a hundred letters bounce in a box you can shake or set gravity-free.
- 🔗 When you share a link to a public project or gallery, it now shows its name and description in chat apps and on social media. We also added a site map so search engines can find public projects and [galleries](https://wordplay.dev/galleries). (#1133)
- 🔊 We added a harmonica, a real recording you can ask for with `Instrument.harmonica` or `🔈.🌬️`.
- 📱 On iPhone or iPad, the installed Wordplay keeps its own projects, and now explains where they are when you don't see them. (#564)
- 🔑 If your sign in link opens in a browser instead of the installed Wordplay, you can now paste the link into Wordplay to finish signing in. (#564)
- 🌐 Wordplay now checks that every translation still matches its English, so we find out the same day when they fall behind. (#1144)

### Changed

- 🌐 The [language chooser](https://wordplay.dev/) now spreads languages across the window instead of stacking them in one tall list, so you can see them all at once. (#1256)
- 🔍 Asking for a language we don't have yet is easier: type a language or country and the menus fill themselves in. (#1256)
- ⚡ We made programs with lots of moving output run three to five times more smoothly.
- 🔊 A song you bring in from a MIDI file now plays its harmonica and accordion parts on the harmonica, instead of turning them into a synthesizer.
- 🧲 We updated the physics engine: things rest on the ground, bouncy things settle, and output no longer gets flung off the stage when it piles up.
- 🧲 @Collision now reports far fewer bumps while something is settling, so a project that counts bumps will count differently than before.
- 📹 The new Video example in the [galleries](https://wordplay.dev/galleries) paints your camera three ways — colored letters, ASCII shading, or colored squares.
- 🛠️ We upgraded internal tooling for stability.
- 🌐 Each language can now write down its own writing rules, and the helper that drafts new translations follows them. (#939)
- 🎨 The new-version message is now grey like other messages at the top, and its button and link sit at the end of the strip.
- 🌐 When you install Wordplay as an app, it now shows up with its name and description in your language, and reads right to left in languages that do. (#564)

### Fixed

- 🌐 When you ask for a language someone already asked for, we now send you to that conversation instead of starting a new one. (#1256)
- 🐛 The “other languages” button on the front page no longer opens two language windows on top of each other. (#1256)
- 🤝 Teachers now see students' edits live and students see their teacher's cursor, without the errors that used to fill the browser.
- 💾 For teachers with many galleries, the save light no longer flips between "Saved" and "Unsaved", the connection warning no longer comes and goes, and the [Teach](https://wordplay.dev/teach) page no longer goes blank.
- 🔑 The sign in page now shows when it's loading, says when it can't connect, and works again when you reload.
- ⌨️ When you press play while your code is on screen, the keys you type now reach your project instead of changing your code. (#1285)
- 🚦 When you name a check and use it later, Wordplay now remembers what it proved, so naming a check that a value isn't `ø` no longer shows an error. (#1285)
- 🌐 We found and re-translated more than 8,000 pieces of text across all 29 languages that still described how Wordplay used to work. (#1144)
- 🌐 About a hundred pieces of text that our translation helper kept skipping are now unstuck and can be fixed. (#1144)
- 📐 Output that appears just after your project starts now gets centered and sized to fit the stage right away.
- 🚦 Doing math with the hue of a color from the @Camera no longer stops your program with "incompatible values".
- 🗣️ Screen readers can now read and reach what a project puts in front of the stage, like a score or a row of buttons.
- 🌐 We fixed many wrong Spanish words: @Stage, @Beat, and tutorial titles read better, and questions and exclamations open with ¿ and ¡. (#939)
- ⌨️ The blue outline showing where the Tab key lands now gets a second outline so it stands out on bright backgrounds.
- 🔗 When you share a link to the new Virtual Piano example, it now shows its name and description the way our other examples do. (#1288)
- 📖 We fixed the Spanish how-to guides, where missing spaces ran words together and broke the example code. (#939)

## 0.29.1 - 2026-08-13

This week we launched a new logo, improved the edit, debug, and play modes for more flexibility, and better organized the growing settings dialog.

### Added

- 🔣 The [Design](https://wordplay.dev/design) page now shows the new logo speaking fifteen writing systems, and lets you download it. (#414)
- 📱 On phones and tablets, a project that listens for keys now shows them as buttons on the stage instead of opening the keyboard, with arrow keys as a pad and letters as a row.
- 🚦 A list type can now say what goes in each place: `[# '']` means a two-item list with a @Number then some @Text, and Wordplay checks the length and order.
- 💬 When a project speaks with @Say, the words now appear on the stage as a white-on-black caption and fade a few seconds after the speaking ends.
- 🔠 You can choose caption size in settings, from three-quarters to three times as big, and your choice is saved on your device.
- ▶️ We added a perform button above the stage that runs your program full screen from the top, and pressing it again restarts the show.

### Changed

- 💬 We gave Wordplay a new logo: a speech bubble that speaks each language's letter on the [home page](https://wordplay.dev/), hops shapes while loading, and holds still if you turn animation off. (#414)
- ⚙️ We better organized the settings dialog so it should be easier to find the setting you want.
- 🖱️ The slider that moves through your program now gets its own row; while editing it snaps between input moments, and in debug it stops at every step.
- 🐛 The pause mode is now called debug, and the mode buttons go edit, debug, play; in debug, each part's value shows next to its code and control.
- ⌨️ Ctrl-Enter switches between edit and play, ctrl-alt-5, 6, and 7 jump to a mode, and ctrl-alt-Enter resets your program.
- 📐 Switching modes no longer moves your windows; you can keep the editor open while your project plays, and leaving full screen restores your windows.
- ▶️ Pressing play now always continues from wherever your program is, even after you edit — speech, music, and animations pick up where they left off instead of starting over. The perform and reset buttons are how you start from the beginning.
- ⏩ If you dragged back into your program's past, pressing play first fast-forwards through what already happened, so you can see how the present came to be, and then keeps going live.
- 📱 On small screens, switching modes brings the right tile forward: play shows the stage, edit and debug show your code.
- ⏯️ When the stage tile is hidden — like on a phone showing one tile at a time — debug mode floats the step buttons and timeline over your code, so you can still step through your program.
- 👆 Tooltips no longer stay stuck when you tap on a touch screen; they appear on hover and keyboard focus, where they can also go away.
- 🚦 A program with an error no longer jumps into debug mode when you press play; only a new error while playing does.
- 🎨 The palette now stays on screen in every mode, with controls you can read but not change outside edit mode.
- 🎼 Captions and the touch keys now sit above the sheet music and the orchestra instead of covering them.

### Fixed

- 🐛 When you add something that listens for input — like a @Chat box — its controls now appear as soon as you finish typing, instead of waiting for the program's next change.
- 🐛 Refreshing the page while playing next to the editor no longer jumps back to full screen; it comes back as you left it.
- 🎨 A text box that isn't taking input right now, like the stage's chat box outside play mode, is dimmed with a dotted underline instead of looking just like an active one.
- 🔊 Restarting a project now speaks its @Say again and replays one-time music and entrance animations.
- 🧲 When you pause and play again, a moving object keeps its speed instead of starting its fall from rest.
- 🌐 If you picked a favorite voice, words in other languages no longer come out garbled; your voice is used only for its language.
- 🔊 Long speech no longer cuts off after about fifteen seconds in Chrome.
- 🔊 On iPhones and iPads, music now plays after you tap "Tap for sound", even on silent, and comes back after a phone call.
- 🎤 On Android phones, a project that listens to sound now asks to use the microphone once instead of over and over.
- 🖱️ Pages no longer scroll past their end, so the bottom bar stays put on a long page like [Design](https://wordplay.dev/design).
- 📱 On iPhones and iPads, fast scrolling no longer leaves the page blank or jumps the code down to your cursor.
- ⌨️ Page Up, Page Down, Home, End, and the space bar scroll the page again, smoothly and by a browser's distance.
- 🔠 On iPhones and iPads, doc words now match the size of the code around them and grow and shrink with it when you zoom.
- 💡 You can now scroll the code suggestions with your finger, and picking one happens when you lift your finger.
- 💡 The list of suggestions no longer opens past the edge of your project, where you couldn't see it at all.
- 🎨 Tapping in the editor no longer paints a grey box behind what you tapped.
- 📐 The edit, debug, and play buttons are now reachable when a window is full screen.
- 🖱️ On iPhones and iPads, choosers like the layout chooser now show a short label instead of a cut-off run-on line.
- 🖱️ Tapping the ☰ button above your code no longer opens the first thing inside it right away, and the menu no longer covers the button you just tapped.
- 📱 On a phone, the box that explains your code now takes at most half the screen, leaving room for the code.
- 📱 The project name at the bottom of the screen no longer takes a fifth of a phone's width.
- ⌨️ Home and End now jump the cursor to the start and end of the line in every text box; Command-Left and Command-Right still work too.
- 🖱️ Holding Page Down or Page Up now keeps turning pages smoothly instead of barely moving.
- 📱 You can now scroll your code with your finger in text mode; to select code, hold your finger still, then drag.
- 🎨 Selected code now shows one clean outline per line instead of stray hooks and marks; blank lines show a small block.
- 📱 On iPhones and iPads, selecting code no longer leaves a grey smear and two round handles over your work.

## 0.29.0 - 2026-08-08

Lots of music and animation polish this week!

### Added

- 🎞️ We added ten more ready-made animations: `swing`, `blink`, `nod`, `dim`, `float`, `drift`, `orbit`, `glow`, `slidein`, and `slideout`, for thirty-five in all.
- 🚦 When you use a name Wordplay doesn't know, we now look for it inside things like @Sequence, @Color, and @Instrument, and offer to fix it for you — `sway` becomes `Sequence.sway`, `red` becomes `Color.red`, and `piano` becomes `Instrument.piano`.
- 🎵 Notes can now be numbers in between: `1.5` plays both notes on either side, the closer one louder. Set a @Track's `mash` to `⊥` to hear one note bent off pitch instead.
- 🎼 We added a music editor to the palette: put your cursor on a song and click to add a note, drag to move it, or use the arrow keys. (#390)
- 🎶 The editor changes one @Track at a time, with buttons for moving between tracks, adding and removing them, turning a note into a chord, and choosing how long a note lasts. (#390)
- 🎼 The staff shows every @Track at once, with the others in grey behind, and they all go dark when you play the whole song. (#390)
- 🔁 A @Track that loops shows its repeats on the staff in grey, so you can see it come back around — and see that stop when you turn `loop` off. (#390)
- 🔊 You can hear a song while you write it, either the whole thing or one track on its own, and a line shows where the music has reached. (#390)
- 🎹 You can now bring in a MIDI file and Wordplay writes it as @Track's of notes, telling you what it had to change. (#390)
- 🎤 You can now hum or sing a tune and Wordplay writes the notes as you sing, working out the key and speed. (#390)
- 🔊 We added a singing voice: give a @Track some `words` and `Instrument.voice` sings them, one syllable per note. (#390)
- 🔣 We added a button under the editor showing every sound the voice can make, each with an example word, a button to hear it, and a letter to type it. (#390)
- 🎼 @Beat now tells you which words are being sung on each beat, so you can put them on stage while the music plays. (#390)
- 📖 We added a how-to that teaches you how to spell words for the voice to sing, in the [Guide](https://wordplay.dev/guide). (#390)
- 🔊 Every act and lesson in [Learn](https://wordplay.dev/learn) now plays a short tune while its title is on screen, picked to match whoever the lesson is about. @Stage gets the lowest and loudest one, @Block's starts on a rest the way @Block starts every line with "…", and @None gets no tune at all. (#390)
- 🎼 We added a lesson about @Music to Learn that starts with one voice, then changes the instrument and speed, then stacks up six voices with sung words and beating dots. (#390)
- 🎶 The dance at the end of Learn now moves to the beat of a band, and you still light up the cast by making noise. (#390)
- 🤖 We added Chatterbox, a little robot you can talk to, inspired by the 1966 chatbot Eliza; find it in [galleries](https://wordplay.dev/galleries). (#380)
- 🎨 The [Design](https://wordplay.dev/design) page now explains our color rules — like never using color as the only clue — and its color table shows how strongly each color stands out against the background. (#1183)

### Changed

- 🎞️ The ready-made animations now belong to @Sequence, so you write `Sequence.sway()` instead of `Sequence(sway())`; Wordplay will offer to fix old names for you.
- 📖 Every ready-made animation now says what its motion looks like and when to reach for it, and comes with an example you can run in the [Guide](https://wordplay.dev/guide).
- 🎨 The outlines around your output only show when the palette is open; double-click anything on the stage to pick it, and unpicked things now get a dashed outline.
- ⚡ We made editing much faster, especially in big projects. (#1265)
- 🖱️ In step mode, the slider now gets its own row instead of a small box, and you can drag the line to move through time.
- ✍️ Tidying your code now breaks up long lines, putting one thing per line for a @Phrase with many inputs or a long list, set, or map.
- ⌨️ The edit, play, and pause buttons are now in that order, and their keyboard shortcuts changed. Ctrl-Enter now switches straight between edit and play without stopping at pause on the way, and ctrl-alt-P pauses.
- 🏷️ The buttons along the bottom that show and hide parts of your project now say what they open, like "show source main" or "hide palette", instead of just "show" and "hide".
- ⚡ Tidying a big project is now about three times faster.
- ✍️ When you type in text mode, typing `(` after a name now just adds the closing `)` instead of extra inputs you never asked for.
- 🧩 Blocks editing still fills in those blanks for you, since code there has to stay whole.
- 🧩 Blocks editing now lets an edit with a wrong type or unknown name land and show in red to fix, but still stops edits that break the code's structure.
- 🧩 More kinds of code can now be built in blocks editing: table rows, type variables like `⸨T⸩`, sharing with `↑`, borrowing with `↓`, notes on a conversion, a language tag on a name, and bold or italic writing in docs.
- 🖱️ When you drop code where it can't go, we now always tell you why, and the drop lands on the spot that makes the most sense.
- 🚦 Errors now get solid lines and warnings get dotted ones, and the conflict list says "error" or "warning" in words. (#1183)
- 🎨 We made keyboard focus easier to see everywhere: the focus blue is a little darker so it stands out, and controls that used to only change color when focused — like the stage's rotate and resize handles — now show a ring too. (#1183)
- 🎨 More places now show their state with a shape or a word instead of color alone: a source with an error wears a ⚠️, the languages you picked for translation get a ✓, and search matches in the guide are highlighted instead of just recolored. (#1183)

### Fixed

- 🎮 We fixed the Where's Waldough game: the 🔁 button now shuffles everyone to new hiding spots, and finding Waldough only scores one point per round. (#1095)
- ✍️ Moving your cursor onto code that makes output no longer takes your typing away from the editor.
- 🐛 We fixed adding or removing a `↓` borrow, which used to leave the code mangled.
- 💡 Some menu suggestions used to save different code than they showed — like putting `1 + _` inside a function's inputs, where it reads as separate inputs. Wordplay now checks every suggestion and only offers ones that mean what they say.
- 📝 We fixed typing a `”`, `¶`, `/`, or `⎦` that Wordplay had already added, which sometimes added a second one.
- 📝 A `\` typed inside writing now adds its closing `\` too, so the marks in the code you put between them stay where you put them.
- 🌙 We fixed documentation links you couldn't see in dark mode because they matched the background. (#1216)
- 🎼 The sheet music now keeps up when you change a @Track's instrument, instead of drawing an old one or stacking them.
- 🌐 We fixed how-to's never getting translated after an English copy was added to a language.
- 🐛 A function marked with ↑ can now use names from outside its structure, which used to stop your project when it ran.
- 🌐 We fixed two words that meant two things at once: gray and brown shared "खैरो" in Nepali, and two fade-out animations shared a name in Swedish.
- 🔊 A note that isn't a whole number, like `1.5`, no longer stops a song from playing.
- 🔊 The little speaker in the corner now goes away once a song's sounds finish downloading, instead of spinning until you press play.
- ✍️ We fixed typing into a @Phrase on the stage, which now works like a normal text box; Escape or Enter gets you back out.
- 📝 You can now type an apostrophe in your text, like in `don't`, without breaking your project.
- 📐 An empty @Phrase now shows an empty box where the text will go, instead of leaving the stage blank with no way back in.
- 💡 Typing `[` or `{` when code is picked now puts your cursor between the two brackets, instead of picking the whole new list or set.
- 💡 Typing `{` right after a list now makes a set.
- 🐛 Long files no longer go blank as you scroll.
- ✍️ Tidying no longer pulls your first line of code up onto the end of your notes.
- 🏷️ A button's tip now changes as soon as you press it.
- 🧱 @Music and @Say now take up no room on the stage, so your words stay centered.
- 📐 In the [Guide](https://wordplay.dev/guide) examples, the warning now shrinks and scrolls, so the start button always stays reachable.
- ⚡ Learn no longer gets slower or freezes the longer you use it.
- 🚦 We fixed the example in the how-to about drawing music. It looked fine, but stopped as soon as a note played, because the height of each dot was measured in `semitones` and the rest of the math wasn't. (#390)
- 🌐 Every language now has the same lessons as English, with missing ones added, ready to be translated.
- 🧱 Anything you make next to a @Stage now goes onto it, so a song plays and a @Phrase shows up. (#390)
- 🐛 A program that uses `???` to pick between choices no longer mixes up what it makes. Every `???` left something behind that pushed everything else out of place, so a program that ended with more than one thing could show the wrong one.

## 0.28.0 - 2026-08-02

This weekend we added music to Wordplay! Thank you to Sahar Abid, Seyeon Park, Chelsea Maitland, Violet Monserate, Carolyn Seiden, and Sai Sreyas Sistla for their design, development, and content contributions at the 2026 CREATE hackathon.

### Added

- 🎵 We added music! Write a song with @Music: give it @Track's of notes, choose an @Instrument for each one, and set the tempo, key, and scale. Notes are just numbers — `1` is the first note of the scale and `8` is the same note an octave higher — so you can write a tune without knowing any music theory. (#390)
- 🥁 We added seventeen instruments. Fourteen are real recordings — piano, two guitars, violin, drums, flute, trumpet, saxophone, bell, didgeridoo, and a cat and a dog twice over each: `cat` and `dog` are whole kits of meows and barks, while `pitchedCat` and `pitchedDog` are one sound you can play a tune with. The other three are synthesizers, which is what they're meant to sound like. (#390)
- 🎼 You can write how long a note lasts on the note itself, using the shapes from written music: `3𝅗𝅥` is a half note and `3𝅘𝅥𝅮` is an eighth. The row of symbols under the editor now offers the ones that make sense where your cursor is, so the note shapes show up while you're writing notes. We also added @Note, for a note that needs its own loudness, and @Beat, which tells your project when each beat happens and what's playing on it, so anything on stage can move in time with a song. (#390)
- 🎨 You can now watch music as well as hear it. In settings, choose an orchestra of instruments, a light show that colors the stage, a mood cloud that reads your song and shows how it feels, sheet music that scrolls the notes past on a staff, or nothing at all. (#390)
- 🔉 We added settings for how loud music plays, and for how much it gets out of the way when something is being spoken out loud. (#390)
- ⚠️ Before a project's music plays, we now warn you when it might be startling or uncomfortable — a sudden jump in loudness, a beat fast enough to flicker, or more instruments at once than is easy to follow. (#390)
- ⏸️ You can hold a song still with @Music's `pause`, and it picks up on the very beat it stopped on. Pausing your whole project does the same thing, so pressing play again carries on mid-phrase instead of starting the song over. (#390)
- 📖 We added six how-to's about music to the [Guide](https://wordplay.dev/guide): how to draw what a song is playing, play a sound when something happens, make music follow the action, let your audience choose the instrument, write rhythm, and layer parts into an arrangement. (#390)
- 🖼️ We added a Music [gallery](https://wordplay.dev/galleries) and moved all of our music examples into it.
- 🎮 We added music to many gallery examples. Instruments, Happy Birthday, Conductor, Row Your Boat, Cat Scat, Chimes, Fireworks, and Lyrics play songs; Heart Attack, What Word, Building Blocks, and Humming Bird now have music that follows how you're doing, and sound effects for what you do.

### Changed

- 🌐 We updated the [home page](https://wordplay.dev/) to say that faces and hands can be input, and that speech and music can be output, and rewrote the Audio/Video gallery's description now that music has a gallery of its own.
- 🎨 When you pick something on stage, it and its code now share the same glowing border with light moving around the edges.

### Fixed

- 🖱️ Clicking something on stage no longer moves it by accident.
- ✍️ Picking something on stage stops when you move your cursor out of its code, and also stops when you close the palette.
- 📖 Examples in the [Guide](https://wordplay.dev/guide) now open ready to read, and play their music when you press play.
- 🔣 A name made only of symbols, like @Note's `♪`, now shows its written name with the symbol beside it, the way every other name does.
- 📖 We fixed how-to examples in the [Guide](https://wordplay.dev/guide) that didn't work, and now check every one so it can't happen again.

## 0.27.0 - 2026-08-01

This week we worked on screen reader accessibility!

### Added

- 🗣️ Screen readers now say what changed in your output, naming the part and its new value like "eyesOpen true," and round tiny numbers.
- ⌨️ Every keyboard shortcut in the editor now says something out loud.
- 🖱️ Clicking in your code now says where the cursor landed, so you hear the same thing whether you move with the arrow keys or with the mouse.
- ⌨️ The editor now echoes your typing to screen readers the way an ordinary text box does — every letter and deletion, right away, with no alert sound. (#1248)
- 📖 The little label that follows your cursor, and the speech bubble beside the editor, now show the same short explanation the autocomplete menu shows: the first sentence of that code's documentation, links included.
- 🧭 When something on stage moves, we now say which way it went and where it landed — "cat moved up and right to 2m 1m" — instead of just "moved." Movements too small to see stay quiet. (#149)

### Changed

- 🗣️ Answers to a key you pressed now speak right away, and news like a finished download waits its turn, so messages can't talk over each other.
- 🌐 When you pick more than one language, spoken labels now use only your first one.
- ✍️ When you help translate a sentence that counts things, we now give you a slot for each way your language counts, show a number that goes with each one, and show what your words will say for each. (#1250)
- 🗣️ We rewrote how every kind of code describes itself, in one consistent style: values say what they are, like "5 meters" or "true," and expressions say what they do, like "evaluate Phrase" or "conditional on true".
- 🔣 Screen readers no longer speak an emoji when code also has a written name — a function named both 💬 and Phrase now says "Phrase." Emoji are only spoken when they're the only name something has.
- 🗣️ Names written as one word, like `eyesOpen`, are now read as separate words, "eyes open," so they're easier to follow out loud.
- 🗣️ Code that holds other code now describes what's inside it, like "conditional on operation greater than on n and 3". (#555)
- 📖 The parts of an explanation now say what they hold: language and word count, text, and code. (#1252)
- 🔍 The parts of a pattern now say what they hold too: a capture says its name, an exact text says its characters, and a range says its two ends. (#1252)
- 🔊 Keys you press while a project plays no longer interrupt the description of the response, and no longer make an alert sound.
- 💡 Typing an operator like `~` or `-` where code is missing now adds a blank and puts your cursor on it, so `~` becomes `~_`. It works everywhere code is expected, like an empty program, inside `(` or `[`, or after `⊤ &`.
- 🚦 An unfinished reaction now says which part it's waiting for, like "missing condition," instead of "unreadable code." It also runs, staying at its starting value until you finish it.

### Fixed

- ✍️ We fixed projects freezing when you changed their code while they were playing.
- 🎨 We made faint text easier to read — links, error messages, and greyed-out words are darker in light mode and brighter in dark mode. (#1183)
- ✍️ We fixed the editor being silent when you delete — each delete now speaks the character it removed, and bigger deletions say everything that vanished.
- 🐛 We fixed the editor saying "Unparsable template" out loud when your cursor reached the end of a line.
- 🐛 We fixed screen readers saying a meaningless number when your cursor landed on a `$name` inside an explanation. Now they say the name. (#1252)
- 🌐 We fixed counting words for single items: a list with one thing now says "list of 1 value", and every language gets the right count. (#1250)
- 🌐 We fixed 545 broken links in the explanations across all 30 languages that showed an empty box instead of the word they point to. (#1245)
- 🌐 We fixed text in 26 languages showing bits of code, like `[$1|and]`, in place of a word.
- 🪟 We fixed boxes sending you to the top of the page when you closed them with the keyboard — now you land back on the button you opened them with.
- 📄 We gave every page a title, so browser tabs and screen readers can tell you which page you're on.
- 🗣️ We fixed screen readers saying what's on stage twice — once as "output phrase hi" and then again as "new phrase hi." Now you hear it once, in the stage's own words.
- 🤫 We fixed the stage describing itself out loud while you edit; it now waits until you press play, so it can't talk over your typing.
- 🧱 We fixed shapes and groups on stage not being named out loud — they're now described just like phrases are.
- 🐛 We fixed the screen reader's selection outline being far bigger than the code you selected; it now draws close to it.
- 🐛 We fixed expressions like `-1` describing themselves to screen readers as a broken template instead of what they are.
- 🌐 We fixed untranslated text showing a "to be determined" message in other languages; it now falls back to English until a translation is written.
- 🗣️ We fixed a project that changes a lot at once — a whole grid repainting — reading out every single change. It now says how many changed, where, and one example, like "12 outputs changed in my grid, like 5." (#555)
- 🗣️ We fixed descriptions ignoring the description you write yourself on a @Phrase, @Group, or @Stage. Yours is now the one that gets read.
- 🐛 We fixed some descriptions having a doubled space in them, like "number type in m".
- 🌐 We fixed unit names always being described in English, no matter which language you use.
- ✍️ We fixed the editor getting stuck on an orange error box when you typed `~` at the end of your code.
- 🐛 If the editor ever can't draw your code, the box that appears now says what went wrong and gives you a button to try again, instead of leaving you with no way out.
- 🎨 We fixed the mark that shows where code is missing — it's now an underline in the gap, level with the underlines on the rest of your code.

## 0.26.3 - 2026-07-25

### Added

- 📦 We added `@Objects`, a new input that uses your camera to spot everyday things and name what it sees in your language, telling you how sure it is and where each one is.
- 🔍 We added [Show and Tell](https://wordplay.dev/project/example-ShowAndTell?mode=play), a new example in the Games gallery: it asks you to find three things and hold each up to your camera — the last one needs two people — and celebrates with a burst of confetti when you win.
- ⏸️ We added a pause symbol that shows over your project's output whenever it's not playing, so it's clear why a clock or animation has stopped.
- 🌐 We added a term list for people translating Wordplay. You can give a word a short key and reuse it everywhere by typing that key after a $, so the same word stays the same across all the text and you can change it in just one place. Keys can be in any language. (#1226)
- 🤝 We added remixing: when you copy a project, we show a link back to the original and credit its maker, and the sharing box shows what yours was remixed from and any remixes people shared. (#788)
- 🔣 The character picker can now find your [custom characters](https://wordplay.dev/characters) — type part of a name or topic to see matching emoji and symbols. (#669)

### Changed

- ⏳ Projects that track hands, faces, or things now show the model download progress and start once it's ready.
- 🗂️ The [Guide](https://wordplay.dev/guide), translation page, feedback form, and character picker now use tabs, and the tab you pick joins the content below.
- 🖼️ We split [Galleries](https://wordplay.dev/galleries) into tabs — yours, examples, how-tos, and public — and each tab has its own web address to share.
- 🧭 On [Learn](https://wordplay.dev/learn), we moved the lesson picker, search, and known-language chooser below the quick and complete tabs.
- ✍️ We renamed the "duplicate" button to "remix" and gave it a new symbol. (#788)
- 🗂️ The sharing box now uses tabs — Gallery, Public, Preview, Privacy, and Remixes — and holds still as you move between them.
- 📜 On the [Rights](https://wordplay.dev/rights) page, we explained that public projects use a Creative Commons license, so others can remix them with credit and share alike. (#788)
- 🔎 When you search in the character picker, a magnifying glass tab appears and stays picked; choosing another tab clears the search.

### Fixed

- ⚠️ We fixed a crash when typing quickly, and the editor now quietly fixes itself the moment you keep editing.
- 🐛 We fixed a link to a missing example showing jumbled text; now it tells you the project doesn't exist.
- 🔗 We fixed some text that showed "@wordplay" as plain words instead of a link you can click, like on the [donate page](https://wordplay.dev/donate).
- 🎨 We fixed links hidden on a yellow background, like the help link in the editor; they're now white with an orange underline.
- 🔊 We fixed a `Say` project speaking when the page first loaded while paused; now it stays quiet until you press play.
- ⌨️ We fixed choice button groups, like the dark and light mode picker; now you tab once to the group, then use arrow keys.
- 🗣️ We fixed choice buttons reading their tooltip to screen readers; now they say their label, which also helps voice control.
- 📏 We fixed drop-down menus cutting off their words; they now fill the whole width they take up.
- 📚 We fixed the lesson picker on [Learn](https://wordplay.dev/learn) looking empty at the start of an act. It now shows the lesson you're on.
- 💾 We fixed unsaved projects piling up unsent while the button said they were saved; now they send in groups and the button warns you when something still needs saving.
- 🛟 We fixed Wordplay deleting a project from your device before your changes reached the cloud; now it only removes a project once your work is saved.
- 🎨 We fixed empty [custom characters](https://wordplay.dev/characters) being invisible in the picker; they now show as a dashed box.
- 🔣 We fixed the character next to your name turning into text like `@you/Star` when it was deleted; now it shows an empty box.
- 🧲 We fixed `@Motion` ignoring the speed you set the first time a project uses physics, so things now spread apart instead of dropping in a clump. (#1231)
- ▶️ We fixed projects freezing when you switched to pause, which goes back to the start, and then switched to play. The output went blank and never moved again. Now it plays.

## 0.26.2 - 2026-07-18

### Added

- ⚠️ We now warn you before a project plays if it might flash or move fast, and you click Start to play it. This shows only for projects you're viewing, not ones you're editing. (#716, #1043)
- 👁️ We added preview panels to watch your camera and microphone live, showing hand and face dots, volume, and pitch as a moving line.
- 📌 We added an `overlay` to `@Stage` for a heads-up display — a list of content pinned flat to the screen that stays put no matter where the camera looks, so a score or label can hold a fixed spot.
- 👁️ We added a view button next to projects you can't edit, like those in someone else's gallery, so you can open their code and see how they work.
- 🐤 We added [Humming Bird](https://wordplay.dev/project/example-HummingBird?mode=play) to the Games gallery: flap a bird through gaps by clicking, pressing keys, or humming.
- 🧟 We added [Heart Attack](https://wordplay.dev/project/example-HeartAttack?mode=play), a new example in the Games gallery: look out through the camera at a field of zombies, strafe left and right, and throw hearts to turn them all back into happy people before they reach you.
- 📊 We added [Code Gap](https://wordplay.dev/project/example-CodeGap?mode=play), a data visualization of data about gender differences in computer science degrees.
- 🔨 We added [Building Blocks](https://wordplay.dev/project/example-BuildingBlocks?mode=play) to the Games gallery: chop trees and rocks into wood and brick, then stack them to match an outline. You can only reach one block above your feet, so hop or build a step to go higher.
- 📽️ We added [Slide Show](https://wordplay.dev/project/example-SlideShow?mode=play), an example that shows how to make a series of slides navigable with the keyboard.
- 📖 We added a how-to in the [Guide](https://wordplay.dev/guide) that shows how to move between content with the arrow keys, using a list, `@Key`, and a number. (#756)
- ◫ We added a quick way in the project footer to change the project layout, which also shows the active layout.

### Changed

- 🌐 We improved the Japanese, Marathi, and Bengali translations, making them more consistent with the platform and it's terminology.
- 🎛️ We added a three-mode switcher above the stage: ✏️ edit freezes the stage, ⏸️ step moves through your program on a timeline, and ▶️ play runs it full screen. If your program hits an error while playing, it now switches to step mode so you can see what went wrong. (#859, #864)
- 🧲 We replaced the physics engine behind `@Motion` and `@Collision` with a faster one, so projects with lots of moving and colliding things run more smoothly. Falling, bouncing, and rolling feel about the same, though some projects may need a bit of tuning.
- 🎞️ When a project moves the `@Stage` camera, the view now glides smoothly to its new spot instead of jumping — and everything on stage, even things that are swaying or bouncing, glides along with it.
- 🧶 We changed the Pounce example so the ball bounces away from wherever it lands on the kitty, instead of always flying the way the kitty faces.
- 🔍 Search in the [Guide](https://wordplay.dev/guide) now also looks inside example code and glossary definitions, so you can find a concept by the code in its examples or a term by the words in its meaning.
- ⚠️ When a program stops with an error, we now show a short name for the kind of error — like "unknown name" — both when stepping in the editor and above the error's explanation on stage, so it's easier to see how the two match.
- 🔢 We replaced the row of dots next to each gallery's name in [Galleries](https://wordplay.dev/galleries) with a count, like "6 projects", so it's clear how many projects are inside (#1070).
- 📐 We made lists of projects and galleries show in two side-by-side columns when your window is wide enough, so there's less scrolling.
- 🛠️ We upgraded internal tooling for stability.

### Fixed

- 🐛 We fixed a bug where checking a named stream for changes with `∆` (or its history with `←`) could suddenly stop a program with an error after another input changed — which made projects quietly stop responding to clicks and choices.
- 🐛 We fixed a bug where a value that changes with an input showed the wrong thing once you used it together with another name in the same `@Phrase` — a slide counter like `1 of 10` would stick at `10 of 10` — and could stop the stage from showing anything at all.
- 🔣 We fixed reading number characters in Chinese, Japanese, and Korean, so words that start with one — like 四角形, meaning rectangle — now work as names.
- 🌐 We fixed a bug where switching between two versions of the same language — like Chinese (Simplified) and Chinese (Traditional) — could show you the other one's names for things.
- 🚦 We fixed `find` and `until` on lists so a function that checks each item now works, just like `filter`.
- 📐 We fixed `@Stack` so content with a small `padding` now lines up in a row instead of piling into one spot.
- 🎞️ We fixed zooming on the stage: after you zoom in, switching back to "fit zoom to content" now lets a project move its own `@Stage` camera again.

## 0.26.1 - 2026-07-09

### Added

- 🙂 We added a `@Face` stream that watches your face and tells you where it is, whether your eyes and mouth are open, if you're smiling, frowning, or raising your eyebrows, and which way your head is turned. There's a new Face example in the [Galleries](https://wordplay.dev/galleries) to try.
- 🎞️ We added a `changing` input to `@Phrase` that chooses how its text changes: `'edit'` erases and retypes it, `'rewrite'` replaces one letter at a time in a random order, and `'random'` spins each letter like a slot machine until it lands on the new text, using only letters that match your text's language and case (#74).
- 📛 Projects can have multilingual names now.
- 🥾 You can now step through example programs to see how they evaluate.

### Changed

- 🔣 You now write a Unicode character by its number as `@U/1F600`, instead of the older form without the U.
- 🎞️ Text in a `@Phrase` now changes instantly unless you choose a `changing` effect.
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

- 🔣 We added fonts for over 150 writing systems, so letters from any language now appear instead of empty boxes.
- 🔠 You can now search characters by name or meaning — type "water" to find 水 — and point at any character to see its name.
- 🕰️ We added `@Moment` for dates and times and `@Now`, a stream of the current time. So `Phrase(Now() → '')` is a live clock in your language (#1197).
- 🌐 Moments work with 16 calendars and any time zone, and dates look the same on every computer (#1197).
- 🔗 Web addresses you write in documentation are now clickable links, and they stay intact instead of losing one of their slashes.

### Changed

- ⚡ We made Wordplay start faster, especially the first time you open a project.
- 🔒 A read-only project now shows a checkerboard pattern instead of a lock icon, and screen readers say when a project is read only.
- 🚦 You can now see errors and hints in a read-only project. You still can't change the code, so we hide the fix buttons.

### Fixed

- 🔣 We stopped Wordplay from downloading big fonts it didn't need.
- 🔠 The character picker no longer shows empty boxes for characters that none of our fonts can draw — it only offers ones you can actually see.
- 🖱️ Links in documentation now open when you click them; to edit one, move into it with the arrow keys or click right next to it.
- ✍️ We stopped adding an extra `/`, `_`, or `*` when you type one in plain text; these now only complete in documentation.
- 📖 Symbols like `[`, `|`, `>`, and `@` in documentation are now just text unless they mean something there. Before, writing `[like this]` in docs could make your whole program unreadable to Wordplay.

## 0.25.1 - 2026-06-30

### Added

- 🪲 When you write documentation with example code, you can now mark an example as one that's _meant_ to have a mistake, so Wordplay won't flag it as an error — handy for showing what a mistake looks like.
- 🌐 Numbers now appear in your language's own digits and style, and you can ask for a specific one with a tag like `5 → ''/hi-IN` (#1196).

### Fixed

- 🌐 We fixed many example programs in the docs and tutorial that broke when translated, so they now appear the way they should.

## 0.25.0 - 2026-06-27

### Added

- 🌐 When you pick more than one language for Wordplay, we now show the interface in all of them at once. Your first language appears full size, and each other language follows it a little smaller and lighter — in labels, tooltips, the [Guide](https://wordplay.dev/guide), the tutorial, and even error messages.
- 🌐 We added a writing layout setting, so your program's output can read top to bottom (vertical) instead of left to right. It follows your language automatically, or you can pick one (#220).
- 📖 When you look at a concept in the [Guide](https://wordplay.dev/guide), we now show a link to the lesson that teaches it and a list of how-to's that use it, so it's easier to learn more (#769).
- 📖 We added a glossary to the [Guide](https://wordplay.dev/guide); search it, or hover any term in the docs to see what it means (#780).
- 📕 Added the first sentence of project documentation to the project previews (#897).
- 📝 When you help translate Wordplay, we now point out text that may be hard to read and suggest when a key word should link to the glossary, so translations stay clear and easy to read (#460).

### Changed

- 🌐 We made Wordplay work much better for right-to-left languages like Arabic and Hebrew, so menus, text, and output flow from right to left.
- 🌐 We now use Claude to translate Wordplay, so the wording is clearer, key words stay consistent, and example programs get translated too.
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
- 💡 We added short notes under each autocomplete suggestion and under code in the [Guide](https://wordplay.dev/guide), so you can see what a concept does without clicking through (#1036).

### Fixed

- 📕 We made the navigation breadcrumbs on the guide more consistent with the page section selection.

## 0.23.0 - 2026-06-13

This week we improved the editor, fixed a few bugs, and added a new shorter tutorial for learners who already know another programming language.

### Added

- › You can now "fold" multi-line blocks of code to make it easier to navigate larger programs (#806, #883).
- ❓ We added a quick tutorial for creators who know another programming language and want to see how Wordplay compares (#1034).

### Changed

- 🛠️ We upgraded internal tooling for stability.
- 🎨 We gave tutorial markers colors and numbers to help distinguish them (#1014).

### Fixed

- ¶ We fixed many inconsistencies with the editor cursor in blocks and text mode.
- 💨 We made the editor's drop down menus faster to display, especially big ones and especially in blocks mode.
- 🐜 We fixed debug timeline dragging.
- 🔦 We moved the output chooser that appears with more than two source files so it no longer overlaps notifications.
- 🚨 We made tutorial highlights more reliable (#902).
- 🔢 We fixed a problem with unit types that let some type conflicts slip through.

## 0.22.0 - 2026-06-06

This week we made improvements to the output palette, output editing on stage, and added a block-based editing palette.

### Added

- 🖱️ There's a new block-based editing palette sidebar for quicker dragging and dropping.
- 🖱️ Block-based editing with drag, copy, and paste is now more consistent, and when something can't be dragged or pasted, we explain why in the editor footer.
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
- 🌈 We added alternating colors and sizes to parentheses and brackets so they're easier to match in text mode, and made screen reader descriptions clearer (#1170).

### Fixed

- 요 We fixed Korean text entry (#1054).
- 🚦 When nothing is selected, the palette's add buttons now only make changes that fit, like wrapping a @Phrase in a @Group. When your program is empty, we offer to add a @Phrase to start.
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
- 🔄 Saving is now faster and more reliable, especially on slow connections, with many projects, or if you briefly lose your internet (#812).

## 0.20.0 - 2026-05-30

This week focused on improving many aspects of the Guide, including speed, usability, and bug fixes. We also added a new stream called @Contour that lets you get the shape of a glyph as a list of points, letting you do neat things to celebrate your favorite letters and symbols!

### Added

- 🔣 We added @Contour, a new input stream that traces letter outlines as a list of @Place values so you can dot, trace, or animate any glyph (#1167). Read about it in the [Guide](https://wordplay.dev/guide?concept=Contour).
- 🔁 We added @Translate, which converts items in a list, set, map, or table using the new `↦` arrow and `⬚` for the current item, so `[1 2 3] ↦ ⬚ + 1` makes `[2 3 4]`.
- 🔗 We made the guide remember the query and sections you were viewing, in case you need to refresh the page or share a link.
- 🎨 @Color has a function called @Color.random, which lets you pick a random basic color, a random color of a particular lightness and chrome, or a random color between two colors.
- 🎨 @Color now has @Color.lighter and @Color.darker, which brighten or dim a color by 5% or any percent you give, like `Color.blue.lighter(20%)`.
- 🔎 We added a search and replace feature to the code editor.
- 🖱️ You can now click, click, click in the editor to expand the selection, just like pressing escape, escape, escape.
- 🔙 We added navigation breadcrumbs to the top of pages, for easier navigation back (#790).

### Changed

- 🔲 We changed the symbol for "this" — the unnamed value inside conversions, reactions, structures, and the new `↦` map — from `.` to `⬚` (a little dotted square). Now you can reach its parts cleanly, like `⬚.x`, instead of the confusing `..x`.
- ⚡️ We made search faster and more forgiving across the platform, including in the guide, tutorial, projects, glyph chooser, and localization mode.
- ▶️ How-to previews now show behavior instead of code; click into the how-to to see and copy code (#1039).
- 📚 We redesigned navigation in the guide to make it more like a web browser, with a home and back button, a browsing history, and links that become inactive.
- ➕ We made it easier to expand and collapse really big values.
- ⌨️ When pressing up on the first line or down on the last line, you go the beginning and end of the source.
- 🚦 When you divide `÷` or take a remainder `%` by a number that might be zero, we now warn you and offer to fix it with `??`.
- 🎨 The color picker now has an eyedropper button to grab any color from your screen, everywhere you choose a color (#1156).
- 💾 We now keep a copy of your projects, galleries, characters, and how-tos on your device, so they work even when you're offline.

### Fixed

- 🤫 We made really long types in the guide a little shorter for readability.
- 🔗 Some concept links in the guide weren't working, but they are now!
- 🎨 The color picker's color band is now keyboard accessible for our friends that keyboards and screen readers.
- ✏️ We made it so that your text cursor positions are saved and restored correctly.
- 📡 When Wordplay can't reach the database, it now shows a clear message instead of freezing, and won't log you out or erase your saved work.
- 📖 We fixed the how-to space so it shows a loading spinner while it connects, instead of wrongly saying the space doesn't exist. (#1171)
- 📷 Small how-to and [Guide](https://wordplay.dev/guide) previews no longer turn on your camera or microphone; they only start when you press play.
- 🤝 We fixed a bug that stopped teachers who are in lots of [galleries](https://wordplay.dev/galleries) from seeing their projects.
- 📋 When you copy and paste your own code, we now keep it just as it is, instead of turning lines into a table by mistake.

## 0.19.2 - 2026-05-27

### Added

- 🔔 We now notify you when a new version of the site is ready while your tab is still open.

### Changed

- ⚡ How-to preview glyphs now appear right away for everyone in a gallery, saved when the author saves a how-to.
- 📐 On narrow screens, toolbars now hide extra buttons in a popup menu (☰), and the footer's links shrink to just their emoji icons.

### Fixed

- 🤝 We fixed the send button in the collaboration chat so it stays visible and works on narrow screens. (#1157)
- 🤝 We fixed a bug where new chat messages didn't appear until you switched browser tabs and came back. (#1158)
- 🐛 We fixed a bug where a "can't connect to the database" message flashed briefly during class; it now shows only after two failures in a row.

## 0.19.1 - 2026-05-26

This week we fixed several bugs that classrooms were running into.

### Fixed

- 📖 How-tos now save automatically as you write, so text you type no longer disappears before it's saved.
- 📖 New how-tos now land close to the others instead of far away or piled up, and you can drag apart how-tos that ended up stacked.
- ⚡ How-to preview glyphs no longer get stuck on a spinning placeholder when other people in the same gallery are editing.
- 🐛 We fixed a bug where projects could crash and freeze the page if a stream kept setting itself off in a loop.
- 💾 Saves and live coediting now refresh your sign-in and try again, so an expired login no longer costs you your work.
- 📛 We now limit project names to 64 characters and character names to 32 characters.

## 0.19.0 - 2026-05-23

This week we focused on multilingual coding features, improved conflict resolution, collaborative editing, and several bug fixes.

### Added

- 🤝 You can now edit a project together with up to four people at once, syncing edits, undo/redo, carets, and selections as you type (#135).
- 🌐 You can now do math with Han numerals for Chinese, Japanese, and Korean (#2), Thai (#6), and Indic numerals for Bengali, Devanagari, Gujarati, Gurmukhi, Kannada, Tamil, and Telugu (#5, #7).
- 🌐 We added Bengali (#142), Indonesian (#148), and Romanian (#433)!
- 🌐 The emoji/glyph chooser now lets you filter by language scripts (#322).
- 🌐 We made text, names, and docs multilingual: tag them like `'hola kitty'/es_en` to mark them as a mix of languages (Spanglish, Franglais, and more), and then you can filter code and output by matching languages (#430).
- 🌐 The @Key stream now shows and accepts key names in your language, like `Key('Espace')` or `Key('Space')`, and autocomplete suggests them (#11).
- 🌐 The @Color structure now has shortcuts for eleven common colors in your language, like `Color.red`, `couleur.rouge`, or `色.赤` (#109).
- 🌐 You can now name a project in many languages, like `"hi"/en"hola"/es`; the shown name matches your language, and search finds it in any language (#456).
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
- 🚦 We now show fewer follow-up conflicts; if a name like `foo` is undefined, we won't also complain everywhere `foo` is used (#1146).
- ⚡ Glyphs on [galleries](https://wordplay.dev/galleries) and your [projects](https://wordplay.dev/projects) page now load right away, and you can pick your own glyph in the share dialog (#435).
- 💾 When projects don't save, the error message now lists which projects failed, why each one failed, and the technical error code to help with bug reports.

### Fixed

- 🌐 We fixed several localization problems in machine translated locales (#122).
- 🤝 Sharing to a gallery no longer fails when many people share at once; we also fixed this for chats, feedback, how tos, and teacher classes.
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

- 👋 There's a new @Hand input that uses the camera to check your hand's location, which fingers are up, and whether your hand is open or your palm shows.
- 🤝 Added the ability to control which other galleries gallery how-tos are shared with.
- 🌐 You can now suggest revisions to any supported language right in the app; we save them locally, then send them as a pull request for review (#437).

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

- 🧭 Each tile in the project view now has a "tour" help feature explaining its purpose and core features (#687).
- 🔍 Emoji searching now supports many more keywords (#1090), but also translations all of those keywords, so that works in all supported locales (#639).
- 🧩 Blocks have a new, more readable style in blocks editing mode, and hide editing controls when an editor is read only.
- 💡 Menu suggestions in the editor are now much more helpful for locales (#1099), text and formatted literals (#635), and unit suggestions.
- 👀 How-to authors can now highlight code by adding 👀 in its explanation, for example `¶👀¶"I'm highlighted!"`.
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
- 💬 We added descriptions to the editor's cursor selection and the conflict pane to help explain what the selected code does.
- 🔑 We added a default user of `creator/password` for developers who are testing on their computers.
- 🛠️ We upgraded internal tooling for stability.
- 🌐 The app's URLs now always include your selected language(s), so your language setting stays reliable when you refresh or share links (#809).
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

- ⏯️ We now close the palette when the project plays, and pause the project when you open the palette.
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
- 📝 We fixed bullets in markup separated by only one line so they now work.
- 🧹 We removed a period floating around the error.
- 💥 We fixed a case where creators who give multiple phrases the same name crashed the page.
- 🔣 We ensured character names are valid with no spaces (#1080).

## 0.17.6 - 2026-04-17

### Added

- We added a Portuguese (Portugal) machine translation.
- We added a <design system@://design> page so that anyone working on design or development for the platform have an easier guide on what colors, fonts, spacing, and components to use (#935).
- We made the user interface components more consistent, usable, and visible.
- We added a more salient button design, but we're not using it anywhere yet.
- We made more progress on the in-app localization editing feature, though it's not quite ready to release yet.

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
- We fixed links in the guide that had identical labels and sublabels.
- We made speech bubble animations respect the aniamtion off setting (#1040).
- Some links concepts in the guide were not working, and were ambiguous, so we fixed the links and made them less ambiguous (#1035).
- We fixed a problem where autocompleting a conversion expression would sometimes wrap the wrong code.

## 0.17.4 - 2026-04-04

### Added

- We added debug and code labels to the project view, to be consistent with other tiles in the project view.

### Fixed

- We fixed broken guide links for machine-translated names (#1027).
- We fixed the text color in drop down items (#1031).

### Changed

- We upgraded internal tooling for stability.
- We're getting close to letting you contribute localizations directly on the website (#437).
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
- You can paste CSV data from the clipboard and Wordplay turns it into a table, even with underscores in headers.
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
- We now ignore added spaces when a placeholder is selected, so you won't erase it by accident.
- We changed all simplified Chinese pronouns to be it (它) instead (#377).

## 0.17.2 - 2026-03-21

### Added

- We added a skin tone drop down to the emoji chooser (#779).
- We added a search to the tutorial, in case that's helpful for browsing by word (#992).

### Fixed

- You can now drag the stage to pan, scroll to zoom, and use the keyboard to pan.
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

- We added emoji and symbol categories, with all emoji variations and the new 17.0 emojis (#110).
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

- We added a new @Speech stream, so if you allow your microphone, projects can respond to speech (#394).
- We added a machine translation of a Hebrew locale (#411).
- We added a machine translation of a Vietnamese locale (#985).
- We made autocompletion of conversions smarter and less buggy.
- We added a zoom control to code editors for accessibility (#772).
- We added a zoom control to the stage.
- We added the /Courier Prime/ font.
- @Evaluate expressions can have commas in them now, in case you're used to other programming languages that separate function inputs with commas.

### Fixed

- We now ignore extra hidden symbols after emojis, so emojis in code don't break things (#970).
- We now handle commas after text and formatted literals correctly.
- Dropdowns now work in Safari (#978).
- The @Pointer stream stopped working, but we fixed it.
- When undoing an edit, the caret was sometimes restored incorrectly, making it impossible to move it.
- We fixed edits that could crash the editor.
- We fixed the wrong feedback on sequence editor percentages.
- When tooltips are near the top or left of the screen, we avoid covering the control they're describing.
- We gave project chat a minimum height so it shows on small screens.

### Changed

- We adjusted the tablet-sized split view layout cutoff to better fit laptop screens.
- We moved the gallery how tos to the top of the guide, above the built-in how tos, to make local guidance more prominent than platform guidance.
- We upgraded internal tooling for stability.
- We generalized the name of "name separator" (commas) to "separator", since they can be used in other places.

## 0.16.45 - 2026-02-28

### Added

- You can now use \×\ as a multiplication symbol, and it's the new default, though \·\ still works.
- We now draw conflicts on a block much more clearly.

### Fixed

- We now dismiss hints on mobile if the page is tapped.
- Initial loads on mobile devices are now less janky.
- Pasting code in text mode now works.
- The guide again shows the full name instead of the symbolic name.

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

- You can now create machine translations of how-to's in a gallery.

### Fixed

- We localized a "username taken" feature.
- We improved some Spanish translations.
- We no longer release a new version when there is a problem with Wordplay's code or locales.

### Changed

- We upgraded minor versions of internal tooling for stability.
- We cleaned up some of the locale translation feedback for developers.

## 0.16.42 - 2026-02-14

### Added

- How-to authors can now make their how-to's visible to broader audiences.
- **Chinese translations of how to examples**. Thank you to our localizers for their translations!

### Changed

- We upgraded minor versions of internal tooling for stability.
- Input streams that correspond to a single input device now re-evaluate the program only once, even if there are multiple streams for that device created.

### Fixed

- Emojis now appear in the timeline again.
- Project tiles no longer collapse when you reload the page.
- Added a missing background to the clear all notifications button.

## 0.16.41 - 2026-02-07

### Added

- We now highlight the updates link on the landing page when there are new updates.
- Creators in a gallery can report problematic chats to curators, who can moderate those messages.
- **Organized the galleries page**. All galleries — yours, examples, and public galleries — now appear on the galleries page (#594, #799).

### Changed

- We made it slightly easier for project maintainers to add moderator, teacher, and other account privileges.
- We upgraded minor versions of internal tooling for stability.
- Markup can now show multiple translations, using your current main language.
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
- **A new updates page**! We made this page so you can see what changed recently; it isn't translated to all languages yet, but your browser may help (#351).

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
