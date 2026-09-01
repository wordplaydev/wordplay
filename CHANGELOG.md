# Change Log

We'll note all notable changes in this file, including bug fixes, enhancements, and all closed issues.
Dates are in `YYYY-MM-DD` format and versions are in [semantic versioning](http://semver.org/) format.
These notes are publicly posted in [production](https://wordplay.dev/updates), so we write them to an audience of teachers and youth.

## 0.34.0 - 2026-09-01

### Added

- 💬 You can now reply to one message instead of to the whole conversation. Replies gather into a thread on the message they answer, and the count turns gold when some of them are new to you. (#821)
- 👍 You can now react to a message with an emoji. Eight common ones are a single press away, and you can search for any other emoji you like. (#821)
- 📎 You can now say which code you're talking about. Put your cursor in the code, press the 📎 beside the message box, and your message carries that line. You can send just the link, with no words at all. (#820)
- 👥 Code somebody has talked about gets a 👥 in the margin beside it. Press it to read what was said. The link follows your program too: add lines above it and it still points at the same code, and if that code goes away the link says so instead of pointing somewhere wrong. (#820)
- 📐 You can now pick which corner of the screen the stage sits in: top left, top right, bottom left, or bottom right. The guide, palette, and collaborate tiles move to match, and your code stays in the middle. (#925)

### Changed

- 🤝 The collaborate tile's list of people now fills the width of the tile, and the box for adding someone waits behind a **+** until you ask for it, so the list takes less room. The list no longer slides when you start writing a message; it just changes.
- ✍️ The message box no longer offers the three buttons for marking up an example (⭐, 🪲, 👀). Those are for writing documentation, not for talking to your collaborators.
- 🧱 The stage now sits in the same corner whatever the shape of your window. Before, a tall window put it on one side and a wide window on the other. (#925)
- 🧹 The layout button at the bottom of a project now shows one icon instead of two, to make room. When your layout is automatic, its tip still says which layout it picked.

### Fixed

- 🐛 A button you'd moved to with the keyboard was dimmed along with the rest of the tile's header, which made the focus outline hard to see. A header you're working in is no longer dimmed.
- 🐛 The settings no longer slide sideways on a narrow window. Rows of buttons now wrap onto a second line instead of running off the edge.
- 🎨 One of the layout buttons in the settings showed a colored icon while the rest were black and white. They all match now.

## 0.33.1 - 2026-08-30

### Added

- 🧭 The [tutorial](https://wordplay.dev/learn) now shows you the interface instead of just talking about it: when a lesson is about the editor, stage, palette, guide, or timeline, it offers a tour that points at each control right where it sits, and waits for you to take it. You can always skip a tour, and one you've taken already won't ask again. (#984)

### Changed

- 📝 We rewrote the lessons that talk about parts of the screen. They now say what the editor and the stage _are_ before using those words, and they explain an exception in plainer language. (#984)
- 📖 We added _editor_ and _stage_ to the glossary, so a mention of either word anywhere in Wordplay can tell you what it means. (#984)

### Fixed

- 🐛 The tutorial pointed at two buttons that don't exist anymore — one for seeing a project's code, and one in the editor's own tour. Both now point at controls that are really there. (#984)
- 🚦 When your cursor is inside a placeholder, we no longer say it's "of type any". That never told you anything. (#984)

## 0.33.0 - 2026-08-29

### Added

- 🌐 We added support for Persian (`fa-AF`)! (#1229).
- 🔔 You now hear what happens after something is reported. If someone reports something you made, we tell you, and we tell you what was decided and which rules it broke. If you were the one who reported it, we tell you what happened too. We never say who reported something. (#938)
- 🤝 Every place where you share something now tells you who can review it — including when the answer is nobody. (#938)
- ⚑ You can now report a project in a private gallery to that gallery's curators. Before, you could only report things that anyone could see. (#938)
- 💬 When someone reviews a message, they can now say which rules it broke and write a note to the person who sent it. Both come to you with the decision. (#938)

### Changed

- 🔔 Your notifications now last. They stay after you reload the page, they follow you to your other devices, and once you clear one it stays cleared. (#938)
- 🤝 Who reviews what you share now follows who can see it. Nobody reviews a project you keep to yourself. A gallery's curators review what's in their gallery, including its chats. We review anything anyone can see. The [rights page](https://wordplay.dev/rights) explains all of it. (#938)
- 🔒 A reported message is now really hidden while someone looks at it. Before, it was only hidden on screen, and the words were still there for anyone who looked closely. (#938)
- 🚩 Reporting a message hides it once. If it's kept and someone reports it again, it stays visible the second time, so reporting can't be used to keep someone quiet. (#938)
- 🤝 Reported messages now wait on the moderation page along with everything else to review, instead of on their own page. Your notifications will take you there. (#938)
- 🤝 The collaborate tile now lists everyone who can reach your project in one table, with a menu beside each person for what they can do: collaborate, comment, view, or take over as owner. Each person has just one, so picking a new one moves them instead of adding them to a second list.
- 💬 A chat now starts by talking. The message box is there as soon as you open the tile, and sending your first message makes the chat, instead of making you press "start a chat" first.
- ✍️ While you write a message, the list of people shrinks to a row of everyone who can read what you say, so the conversation gets the whole tile.
- 🌐 The "translate messages into" and "I'm writing in" menus now sit together on one line above the message box, since they are two halves of the same question. We took away the search beside each one, because the menus already list every language Wordplay speaks.
- 🤝 Every place Wordplay lists people — a gallery's curators, a class's students, a character's collaborators — now uses that same table, so adding and removing someone works the same way everywhere. When there's room it puts two or more people on a row instead of one, which makes those lists much shorter.

### Fixed

- 🔒 Your notifications no longer stay after you sign out. On a shared computer, the next person could see warnings meant for you. (#938)
- 🔔 Turning off how-to notifications no longer clears all your other notifications too. (#938)
- 🔔 You now hear about messages that came in while you were away. Before, we only told you about ones that arrived while the page was open. (#938)
- 🔔 Several reported messages in one project now show as several notifications instead of one that never went away. (#938)
- 🐛 The report flag on a chat message no longer opens the report box for every message at once. (#938)
- 🐛 Reporting the same thing twice no longer makes two reports. (#938)
- 🔒 Only the person who owns a project can delete its chat now. Before, anyone in the chat could delete the whole conversation. (#938)
- 🐛 The same person could end up in two of your project's lists at once and show up twice in the collaborate tile. Now everyone has one privilege, and an old project fixes itself the first time you change anything.
- 🐛 When you typed a name we couldn't use, the message saying why could get cut off, or hidden behind a button. It now floats above everything, right under the box you typed in.
- 🗣️ Screen readers now hear why a name was rejected in the boxes that hold several lines of writing. The message was on screen, but nothing tied it to the box, so it was never read out.

## 0.32.1 - 2026-08-28

### Added

- 🔍 You can now search the [galleries](https://wordplay.dev/galleries). Type a word and you'll see galleries whose name or description matches it, example projects, and projects from galleries people have shared. (#299)
- 🤝 Getting your gallery onto the galleries page is now a request: a moderator reads it first and decides whether to list it. Your gallery page tells you whether it's waiting, listed, or turned down, and you get a notice when that changes. (#1311)
- 📚 Six examples that weren't in any gallery are now in one, so you can find them: Adobo Recipe, Color Show, Laughing, Layouts, Mumble, and Wild Transforms.
- 🌐 We made it possible to add the other spellings of a glossary word — the plurals and endings each language needs — so a link like `@parameters` holds the whole word instead of stopping partway. If you help translate Wordplay, there's a new Glossary tab where you add and remove them. (#1244)
- 📖 We made it easier to fix a glossary word or what it means: you can now change it right where you see it in the [Guide](https://wordplay.dev/guide), instead of finding it in a long list of text. (#1244)
- 🌐 If you help translate Wordplay, you can now fix the notes the editor shows about problems in your code — both the short name of the problem and the sentence explaining it — right where you read them, instead of finding them in a long list. The parts the sentence fills in for itself, like the name of the thing that's wrong, stay put while you edit, and the note reads normally again once you save. (#1275)
- 📖 In the same way, you can now fix what the editor says a piece of code is, and the help text for anything built in, wherever those show up. (#1275)

### Changed

- 📖 How-tos shared in a gallery now live in the [Guide](https://wordplay.dev/guide) with all the other how-tos, grouped under the gallery that shared them. They used to sit on the galleries page, which is for galleries. (#1277)
- 🤝 The galleries page now shows public galleries in a different order each visit, so every one gets a turn near the top. It also says so when none have been listed yet, instead of showing an empty space. (#1311)

### Fixed

- 🌐 In localization mode, some text showed an edit button that quietly threw your change away when you saved it, and a few would have saved it to the wrong place, replacing a whole group of text with one sentence. A button now appears only where there's really something to change. (#1275)
- 🌙 In dark mode, the highlighted word in a search result was too pale to read on its yellow background. It's dark now, like every other yellow highlight in Wordplay.
- 🌐 The Python, JavaScript, and Java samples in the [tutorial](https://wordplay.dev/learn) had been translated along with the words around them, which broke the code in all 29 languages. Code reads the same for everyone, so we put it back the way it's written.
- 📖 About 50 tutorial lines told you to try something without showing it — a sentence about using `+` with no `+` in it. We put the missing examples back in Portuguese, Spanish, Hindi, and Chinese.
- 📖 In the Spanish and Chinese tutorials, some characters said the same line twice. We kept the better wording and dropped the repeat.
- 🌐 The examples that teach language tags had lost their tags in every language, showing `'hello'` where they meant `'hello'/en`. They teach what they're for again, and text that is meant to stay in another language is no longer translated away.
- 📖 Three how-tos — drawing the music, keeping track of a game, and the video grid — were missing examples we had added to the English ones. They're up to date in every language now.
- 🌐 We fixed names that had been translated into the wrong word, so you can type what the [Guide](https://wordplay.dev/guide) shows. In eleven languages the word for the kind of thing a list holds had become the word for being kind, in Polish a `Set` was the verb for arranging things, and five Hebrew names carried marks nobody types. (#1324)

## 0.32.0 - 2026-08-26

### Added

- 🗨️ Give a @Phrase a `bubble` and it says something in a speech bubble that points right at it, so letters can talk to each other. Put words in it, or a @Say so it's spoken out loud as well as shown, or a @Bubble to pick a color or make it a thought instead. (#75)
- 🗨️ A bubble finds its own place: above whoever is speaking, or off to one side if something is already there. Your stage makes room for it too, so what someone says is never off screen. (#75)
- 🗨️ We added a new example called Dialog to the [galleries](https://wordplay.dev/galleries), where two letters talk about how strange it is that letters talk. (#75)
- 📐 A @Row can now line its content up on the baseline, the line that letters sit on, so a short `a` and a tall `b` read as one line instead of two. Choose `_` for the row's alignment.
- 🔠 Every font now says what it looks like, so you can pick one without seeing it. The font chooser reads "Creepster, a textured face, strong and old-fashioned" instead of just the name, and a phrase tells you what face it's wearing. There are 12 words for the shape of the letters and 13 for how a font feels, and they're translated into every language Wordplay speaks. (#298)
- 📐 Things on your stage now line up with each other when you move them. Drag one near another and it snaps to its left or right edge, its middle, or the line its letters sit on, and a line shows you what it lined up with. Turn the grid on and it snaps to the grid too. Hold Alt or Option while you drag to place it anywhere you want. (#117)
- 📐 You can line things up with the keyboard too. Arrow keys move whatever you picked, and holding shift while you press an arrow jumps it straight to the next thing it can line up with that way. Wordplay says where it landed and what it lined up with, so you can lay out a stage without seeing it. (#117)
- 🧱 The palette now has a row of + buttons across the top for adding things to your stage: a phrase, a rectangle, a circle, a many-sided shape, a line, music, or speech. It stays put while you scroll, and it's there whether or not you've picked something. Before, a character offered to add one thing at a time and stopped offering once you had one, so a second phrase meant writing it yourself.
- 🧱 A new thing lands below whatever is already on your stage instead of on top of it, and Wordplay picks it for you so you can start changing it right away. If you picked something first, the new thing goes in beside it.
- 🔳 Pick two or more things on your stage and press 🔳 to collect them into a @Group. When it can't, the button says why. (#119)
- 🔣 You can now make a circle or a many-sided shape, not just a rectangle. Each has its own button, and each shape now has a symbol you can type: `▭`, `●`, and `⬢`.
- ✏️ You can now draw on your stage. Press the pencil in the palette, then drag to sweep out a line, or click once for each place you want it to bend. Arrow keys move a dot around and Enter drops a point, so you can draw without a mouse, and Escape finishes. Wordplay tidies the line up when you let go, so a wobbly drag doesn't leave hundreds of points in your code. (#167)
- ✏️ The pencil turns itself off once you've drawn a line, so you won't start another one by accident when you meant to pick the line you already have. If your program is empty, pressing it gives you a @Stage to draw on. (#167)
- 📐 A new shape, @Path, draws a line through a list of places, and you can type it as `╱`. Ask for `closed` to join the last place back to the first, `smooth` to curve through your places instead of turning at them, and `thickness` to say how thick to draw it. It takes a plain list of places, so anything that makes places can draw one — including @Contour, which traces the outline of letters. (#167)
- 📐 Pick a line you drew and every place on it gets a handle. Drag one to bend the line, or use the arrow keys. Enter adds a place halfway along, and Delete takes one away. (#167)
- 🧲 A @Path on your @Stage stops things by its real shape, so you can draw a hill or a valley and watch things roll into it. Circles and many-sided shapes already stopped things by their own shape; lines do now too. (#167)
- 🔠 Give a shape `glyphs` and Wordplay writes that text along its edge, over and over until it fills. Words can run around a circle or a hexagon, and a line can be drawn out of letters instead of ink. (#167)
- 🎨 Shapes now have `filled` and `stroked`, so you can have just an outline, or neither — which is how you make a wall that stops things without being seen.
- 🌐 You can now write a language tag with the language's name, not just its code: `'hola'/Español`, `'hola'/Spanish`, and `'hola'/es` all mean the same thing, and so do `/es-México` and `/es-MX`. Capitals and accents don't matter, so `/espanol` works too. (#1220)
- 🚦 Wordplay now tells you when it doesn't know the region in a language tag, the way it already did for the language. Before, a misspelled one like `/en-Merica` quietly meant nothing. (#1220)
- 💡 You can now finish a language tag by typing part of one. Type `/esp` and pick `/español`, `/span` and pick `/Spanish`, or `/en-U` and pick `/en-US` — and once you've typed something, every language and region is offered, not just the ones Wordplay speaks. (#1220)

### Changed

- 🗨️ Three examples now use speech bubbles instead of words placed by hand: the map that tells you about a place when you bump into it, the face that says your mood, and the story Pears. (#75)
- 📐 When your program shows more than one thing, they now go exactly where you put them. Wordplay used to quietly gather them into a @Group and stack them, which threw away the up-and-down part of every place you wrote and moved the side-to-side part too. Things with no place of their own now sit on top of each other in the middle, so give them a place — or write a @Group yourself if stacking is what you wanted.
- 🌐 The [language chooser](https://wordplay.dev/) now writes each region in its own language, so you'll see "México" and "日本" instead of "Mexico" and "Japan". You can still search for either one. (#1220)
- 💡 When you pick a language tag from the menu, it now says which language the tag is for, so `/es` reads as "español" and `/es-MX` as "español (México)". Before, every choice showed the same sentence. (#1220)
- 🌐 After you type a language, we now offer the places where people speak it — `/en` offers `-US`, `-GB`, and `-CA` — instead of every place Wordplay happens to know. Adding a second language is still there, just further down the list. (#1220)

### Fixed

- 🔠 The font chooser used to read a font's markers out loud as "no tilde asterisk caret slash", and read the writing a font supports in that writing's own letters, so an English voice said "Ελληνικά" letter by letter. Now it says "no light, bold, extra, italic" and "Greek", while still showing the symbols and the letters on screen. (#298)
- 🖱️ Sometimes you'd click something on your stage and nothing would happen — it got a blue outline but no handles, and the arrow keys wouldn't move it. That could last until you changed your code again. Now a click always finds what you clicked on.
- 🔍 Your stage used to zoom in and out while you dragged something across it, which made things hard to place. Now it holds still while you move and fits your work again once you let go. If it ends up further out than you want, restart your program and it will frame everything fresh.
- 🗣️ Screen readers used to read the name of a group or a shape as its symbol, saying "white square button" where they meant "group". Now they say the word.
- 🐛 When a language tag named the same region twice, letting Wordplay fix it also deleted the other regions you had listed. Now it only removes the repeat. (#1220)
- 💡 The menu wouldn't help you write a language tag at all. Typing `'hi'/` offered no languages, `'hi'/en` offered no regions, and `'hi'/en-U` wouldn't finish into `/en-US`. Now each of them offers what comes next. (#1220)
- ✍️ Adding something to your program used to pull your project's description up onto the first line of your code.
- 🎨 Picking a @Say used to show an empty palette. Now you can edit what it says there, like anything else.
- 🐛 A small shape was drawn lower than the box that picks it, so its outline, its turn and resize handles, and the shape itself all sat in different places. They line up now.
- 🎨 Using a circle or a many-sided shape as your stage's `frame` cut out the wrong part of the stage. The piece that showed and the edge drawn around it were nowhere near each other.

## 0.31.0 - 2026-08-25

### Added

- 🔊 Turn on evaluation cues in settings and Wordplay makes a short sound each time your program runs again, with a different sound for each kind of input. The tour of the time slider explains them. (#537)
- 🧲 Turn on collision cues and you can hear things bump into each other on your stage. A harder hit is louder, and several things landing at once sound like several things.
- 🎞️ Turn on animation cues and you can hear what an animation is doing: turning changes the pitch, moving side to side moves the sound side to side, and fading out makes it quieter. An animation that repeats plays the same little tune every time around.
- 🔊 A `@Pose` can now carry a `@Music`, which plays the moment that pose happens. Give the pose you enter with a little sound and it plays as your phrase arrives; put one on a pose inside a `@Sequence` and it plays when the animation reaches it. Before this, making a sound land with an animation meant building something in between for both of them to watch. (#22)

### Changed

- 🧭 On a small screen, switching between your code, your stage, and your other windows used to take four taps through the ☰ menu. Now they have their own row right above the project name, so it's one tap, and tapping the window you're already looking at keeps it instead of hiding it.
- 🔤 `sorted` can now use a word to sort by, not just a number, so you can sort a list of things by one of their names, like sorting people by their last name. Emoji now sort by what they are, so hearts sit next to hearts. (#1322)

### Fixed

- 🎨 A button that's turned on now looks pushed in: it sinks down and darkens. It used to move up instead, and in dark mode it looked lit up rather than pressed, with some buttons losing their picture entirely.
- 🔤 Sorting words used to put every word starting with a capital letter before every word starting with a small letter, so a word like "amy" ended up far away from "Amy". Now words sort in alphabetical order, the way a dictionary does, independent of case. (#1322)
- 🐛 We fixed a crash that could happen when you added a new input like `Speech()` above one you already had. Wordplay was replaying your earlier key presses and clicks into the wrong input.

## 0.30.1 - 2026-08-24

### Added

- 🔣 You can now choose whether an emoji you add is in color or black and white. Pick which one in the emoji chooser, and Wordplay keeps your choice when it shows the emoji and when you copy it.
- 📋 You can now select the text your program shows and copy it somewhere else. This works while a project is playing, and on anything your program shows that isn't a stage.
- 🔊 The notes your music is playing now light up in your code as you hear and see them. In a melody written as a list of numbers, each number glows when its turn comes.
- 💡 The menu you get while writing code can now build much more of the language. You can take an item out of a list or a map, change a number's kind with `→`, ask a question with `???`, look back at a stream with `←`, change one part of a structure, and update a table.
- 🔢 You can now write numbers in Roman, Han, Thai, Bengali, Devanagari, Gujarati, Gurmukhi, Kannada, Tamil, and Telugu numerals, and in base 2 and base 16. Pick a digit to start, then add more digits before, inside, or after it to build up a bigger number. There's no keyboard for these, so the menu is the only easy way to write them.
- 🌙 Your projects can now go dark along with the rest of Wordplay, so a bright stage isn't a bright white square at night. Every color keeps its own hue and stays as far from the others as you made it, projects that are already dark are left alone, and you can turn this off in settings to always see the colors you wrote. (#65)

### Changed

- 📋 Selecting all text on a page used to sweep up buttons, tab names, and footer links along with the words you actually wanted. Now only real text can be chosen: paragraphs, headers, what your program shows, the help and guide writing, page titles, names, and anything you can type into.
- 💡 The menu now groups units by what they measure, so finding `km` means opening Length instead of scrolling past all 126 units. The plain number choices come first now, instead of last.

### Fixed

- 💡 Ready-made things like `Sequence.sway()` and `Color.random()` never showed up when you typed a dot after their name. Now they do.
- 💡 The menu used to offer code that couldn't work. After a dot it forgot the name you picked, so `a.` offered `a()` instead of `a.📏()`, and after a `+` it offered things that only work on the number before it.
- 🧩 Choosing your whole program gave you an empty menu. It now offers to add something to your program.
- 💡 Typing a letter in the menu skipped the very first choice, so that one could never be picked that way.
- 🔍 We fixed the search box in the emoji and symbol chooser. It used to lose your place after the first letter, so everything you typed after that went nowhere.
- ✍️ We fixed how chosen code looks when it has an emoji in it. Choosing one emoji, or a stretch that starts or ends with one, used to show no highlight at all.
- 📖 A word in our explanations pointed at a page that didn't exist, so it showed an empty box instead of a link. Markup and type variable now have their own pages in the [Guide](https://wordplay.dev/guide), and the markup page shows an example you can try.
- 🌐 In several languages the word markup was translated as the money kind, like a price markup or a page margin, instead of text with bold words and links. It now means formatted text in every language.
- ✍️ We fixed an extra space that crept in before a linked word in code, so `a @Phrase` no longer looks like `a  @Phrase`.
- 🎞️ We fixed which code lights up while something on stage is moving. A ready-made motion like `Sequence.sway()` used to light up nothing at all, and a motion that never really moves used to light up as if it did. (#543)
- 🎨 A project that paints itself a dark background used to draw its outlines and edges in colors picked for a light page, which made them hard to see. They now match the background you chose.

## 0.30.0 - 2026-08-22

### Added

- 🔠 Text can now take a piece of itself with `subsequence`, find where another text first shows up with `index`, swap every copy of one text for another with `replace`, drop the blank space at its ends with `trim`, and turn itself backwards with `reverse`.
- 🔣 Formatted text can now become a list of its symbols, or a number, the same way plain text can. (#1190)
- 🔢 You can now write `!#`, the not-a-number value, in your own code. Wordplay always knew how to make one — turning text like `'hi'` into a number gives you one — but writing it yourself was marked as a mistake.
- 🎭 Our [home page](https://wordplay.dev/) now has a stage. Press show me and nine tiny programs play right there, each with its code beside it and a note in the code saying what it does. (#921)
- 🧲 @Output can now pull other @Output toward it. Give a @Phrase @Matter with a `pull` and it works like a planet or a magnet, tugging anything that moves with @Motion. A negative pull pushes away instead. We added a new example called Orbits to the [galleries](https://wordplay.dev/galleries), with three planets circling a star. (#20)
- 💨 The @Stage now has `air`, which says how quickly moving @Output slows down. Normal air is 1, and 0 is outer space, where things keep going forever. (#20)
- ✍️ You can now fix a path after you draw it. Pick one in the [character](https://wordplay.dev/characters) editor and press enter, and each point becomes a handle you can tab to, move with the arrow keys, add to with enter, and take away with delete. (#667)
- 📐 A path's straight lines can now bend. Choose a point, press curve, and a handle appears that bends the line coming into it; press delete on that handle to make it straight again. (#774)
- 🗣️ The character editor was nearly silent to a screen reader. It now says what happened when you move a shape, draw or erase a pixel, finish a shape, delete, undo, copy, paste, reorder, flip, or change a point. (#666)
- 🔣 You can now add a letter, symbol, or emoji to a [character](https://wordplay.dev/characters). Add it as pixels you can recolor one square at a time, or as an outline you can resize and turn without it going blurry. (#924)
- 🖼️ You can now add an image to a character. Pick the square of it you want to keep and we shrink it to fit the grid. Your picture never leaves your device. (#739)
- 🖌️ The pixel brush and the eraser now have a size, so you can cover more than one square at a time instead of erasing square by square. (#898)
- 📏 Numbers can now change between more than 200 units with `→`. Temperature, volume, angles, area, speed, pressure, energy, power, electricity, how often something repeats, brightness, and computer storage all work now, on top of the time, length, and weight units we already had. (#363)
- 📐 An angle can now become radians, like `45° → #rad`. `sin`, `cos`, and `tan` all count in radians, so this is how you take the sine of a turn or of a color's hue. (#363)
- 🥤 Cooking and liquid measures work too, but you have to say whose: a US gallon and a British one are different sizes, so it's `usgal` or `ukgal`, never a plain `gal`. `tsp`, `tbsp`, and `cup` also work. (#363)
- 🔢 `⊤` and `⊥` can now become numbers with `→ #`, giving 1 and 0. That makes counting how many things are true much easier. (#363)
- 🗂️ You can now put your projects in folders on your [projects page](https://wordplay.dev/projects). Make a folder, then drag a project onto it, or choose a project and move it with the up and down arrow keys. Deleting a folder puts everything inside it in your archive, so nothing is lost. (#831)
- 👑 You can give project ownership to someone you're working with. Open the people you share it with and press the crown next to their name; you stay on as a collaborator and can keep editing. (#189)
- ⚑ You can now report a public project that breaks the sharing rules, using the flag in the corner of the stage. A moderator looks at it, and only moderators can see what was reported. (#193)
- 🔒 If we find public content of yours that breaks the rules, you now get a warning in your notifications saying which warning it is. After three, you can still make and share projects with people you choose, but you can no longer make anything public. The [rights page](https://wordplay.dev/rights) explains all of it, including how to ask for public sharing back. (#193)
- 🔬 Each project now has a Research setting in its sharing options, off unless you turn it on. It lets us show that project as an example when we write and talk about Wordplay, without your name or anything else that says it's yours. (#922)
- 📖 Every example in the [Guide](https://wordplay.dev/guide) now has a Test it button. It opens a copy of the example in a new window that you can change and play with, kept on your device and out of your project list, with a link back to what you were reading. (#1044)
- 📧 You can now write an email address in a doc or a how-to and it becomes a link that opens a message. Before, the `@` in an address was read as the start of a `@link` and the address disappeared.
- 💾 Some of your settings stay on the device you set them on, and some follow your account. There was no way to tell which was which, so the ones that follow your account now have a small cloud beside them that says "Saved across devices". Signed out, the cloud is grey and tells you what signing in would do. (#231)

### Changed

- 🔣 Counting the symbols in text now counts what you see. A family emoji like 👨‍👩‍👧 is drawn from several pieces, and `length` used to call it five symbols instead of one.
- 🧹 The list functions `without` and `withoutAll` did exactly the same thing under two names, and `without` said it removed only the first copy when it never did. They're one function now, all four names still work, and it removes every copy.
- 🔢 Two not-a-number values are now equal, so `!# = !#` is true. Asking whether a number came out of text you couldn't read is the whole reason to compare one, and it could never be true before.
- 📐 On a phone, the character editor was three thin columns and none of them were usable. It's now one column: the character, then the commands you can use, then the colors.
- 🔣 Making a copy of a character now uses the same symbol as remixing a project, `⧉`. The book symbol means copy to the clipboard everywhere else, and one symbol shouldn't mean two things.
- 🎨 The saved message at the bottom of the page now shows a cloud instead of a globe. A globe can mean anything on the internet, and we use the cloud everywhere else for work kept in your account. (#231)
- 💡 Auto-complete now says what each unit means. Picking `km` shows "kilometers" instead of the one note every unit used to share, and if you chose more than one language, you'll see the name in each of them. (#890)
- 🛠️ We updated internal tooling.

### Fixed

- 🌐 We fixed the explanations of built-in things, like `#km → #m`, always showing in the language a project was written in instead of the language you chose. Open an English project with French picked and the explanations are now French too.
- 🔗 A project with no name left the browser tab titled "Wordplay - ", which told you nothing when you had two open. It now says the project is untitled.
- 🖱️ Two links on a project in your list sat too close together to tap reliably. They're now big enough to hit.
- 🧲 Writing a strange number like `!#` or `∞` for the @Stage's `gravity` used to freeze everything on the stage that moves. Wordplay now uses ordinary gravity instead. (#1305)
- 🧲 A @Phrase with @Matter crashed the program the first time it changed size, if it was the only thing physics was moving — like a score that counts up. (#1315)
- 🐛 Formatted text with a language on it never matched the same formatted text without one, so `` `hi` `` and `` `hi`/en `` looked like different things. Plain text was fixed for this before; now formatted text is too.
- 💾 Four settings — font face, line numbers, wrap lines, and space markers — were meant to follow your account, but they were never really saved there, so they stayed on one device. They now travel with you. (#231)
- 🐛 Reversing a list changed the list you started with, instead of leaving it alone and handing you a new one.
- 🐛 Sorting a list could jumble items that had nothing wrong with them, if any one item's sorting number wasn't a number. Those items go last now, and everything else keeps its order.
- 📖 Writing `!#` in a help page quietly erased the rest of the sentence, so we couldn't explain the value at all.
- 🎭 The button that puts a file's output on the stage disappeared when you closed the other files, so you had to open one of them again just to get the button back. It now shows up whenever your project has more than one file. (#1302)
- 🔊 The bars that show what music is playing were squashed to a few pixels on any small stage, so it looked like only the instrument was moving. They fill the space they're given now. (#1314)
- 🗣️ Screen readers said nothing at all about shapes on the stage. They now read a shape's description, the way they already read a phrase's. (#1314)
- 🖱️ Pressing space while a program was playing scrolled the page instead of going to the program, so a program that listens for keys could be scrolled out from under you. (#1314)
- 🧩 With blocks turned on, code written inside a sentence — like the `1m` in a help page — became a big box that broke the line around it. Code inside a sentence now stays text, in the [Guide](https://wordplay.dev/guide) and everywhere else. (#1314)
- 📖 A link to another part of the language, like `@Time`, showed up as plain text when it appeared in a program's documentation. It's a link now, the same as it is in a help page. (#1314)
- 🐛 Undo in the character editor went back two changes at a time, and the newest thing you made could never be brought back. One undo now takes back exactly one change, and a rectangle you finish with the space bar is remembered too. (#1306)
- 🔄 Flipping only ever moved paths, and no flip could be undone. It now mirrors everything you've picked — rectangles, ellipses, and pixels too — and undo takes it back. (#1306)
- 🎨 Button labels were hard to read while you pointed at them in dark mode, because they stayed white on a gold background. They're dark now, everywhere in Wordplay. (#1318)
- 👆 The color swatches were too small to tap. They're big enough to hit now, and wrap onto more rows instead of getting thinner. (#1318)
- ⌨️ The character editor's instructions showed jumbled text where the keys to press should have been, and shortcuts elsewhere were spaced unevenly. Both now show the right keys for your own computer. (#1318)
- 🖱️ Drawing or erasing with a quick drag left a dotted line instead of a solid one. Both fill in the gaps now. (#898)
- 🐛 Opening a dialog in the character editor threw away your undo history, so you couldn't take back anything you did before it. (#1318)
- 🔣 An emoji added as pixels came out a square too fat, with a faint edge around it. (#739)
- 🐛 A year was 364 days. `1yr → #day` now gives 365.25 days, the way a year actually works. (#363)
- 🐛 Changing grams into ounces or pounds was a little bit off, because the number we multiplied by had been rounded. `1kg → #oz` said 35.274 ounces; it now gives the exact answer. (#363)
- 📐 `sin`, `cos`, and `tan` kept the unit of the number you gave them, so the sine of `45m` came back in meters. They give a plain number now, because a sine compares two lengths and so has no unit of its own. (#363)

## 0.29.3 - 2026-08-19

### Added

- 🌐 When you translate a project, Wordplay now shows how far it's got instead of just spinning, and counts the phrases as they're done. Big projects used to look stuck, and sometimes gave up partway through. (#1276)
- 🌐 When you translate a project, you now choose what that means: add the new language to what you wrote, or rewrite your project in it. Adding is the default, and it leaves your code exactly as you typed it. (#1276)
- 🔒 Translating now has a daily limit, shown as a small bar with how much you have left today and when it fills back up. Machine translation costs real money, and this keeps anyone from running up the bill. (#1073)
- 🔍 The stage now shows how far you've zoomed, as a small bar that fills up and down with a line across the middle for the project's own view. Press it to go back to that view. (#1175)
- 🧭 If you zoom or pan until nothing is left on the stage, Wordplay now tells you so and gives you a button to bring everything back. (#1175)
- 🗣️ Screen readers now say the zoom level as you change it, and say when the stage has nothing left on it. (#1175)
- 🔠 Text and formatted text can now be made all uppercase or all lowercase. Use `lowercase` on two words to compare them without caring whether either starts with a capital letter. (#1301)
- 🌐 Changing text to uppercase or lowercase follows the rules of the language you tagged it with, so Turkish text changes its dotted and dotless `i` the Turkish way. (#1301)

### Changed

- 🧭 The links along the bottom of every page are easier to notice and easier to press. The words are underlined so they look like links, and each one has a bigger area you can tap. (#836)
- 🧭 The link for the part of the site you're on now looks like a tab joined to the page above it, and it keeps showing when you open something inside that part, so you can always tell where you are. (#836)
- 🔑 You now need an account to translate a project. That's how everyone gets their own fair share of translating each day. (#1073)
- 🌐 The languages button now says "translate" when your project is written in just one language, instead of telling you it has one. Once it has more, it counts them again. (#1276)
- 🎨 The translate button now stands out as soon as you pick a language to translate into, so it's easier to find. (#1276)
- 🖱️ Zooming the stage now moves by the same amount every time, so one zoom out is undone by exactly one zoom in. Before, a single flick of the scroll wheel could take hundreds of clicks to undo. (#1175)
- 🔍 How close you can zoom in now depends on what's on the stage, instead of one fixed limit. On most projects you can get much closer, and things placed near you no longer disappear when you zoom all the way in. (#1175)
- ⚡ Checking your program for mistakes is faster, especially in long programs and while you're partway through typing something. (#808)

### Fixed

- 💾 The bottom of the page grew taller for a moment while your work was saving, which nudged everything above it. It stays the same size now.
- 🧲 @Collision only worked if you gave both things @Matter, and nothing told you so. Now naming two things is all it takes for them to notice each other. @Matter is for how heavy, bouncy, and slippery something is, and for letting a @Motion push it around. (#548)
- 🖱️ The Wordplay logo at the bottom of the page showed nothing when you pointed at it or moved to it with the keyboard, so there was no sign it was a link. Now it does. (#836)
- 🌐 In 29 languages, the tutorial pointed at code examples that weren't there — a lesson would say to use `+` but never show it. We put the missing examples back, and Wordplay now checks for this so it can't happen again. (#928)
- 🌐 We redid the whole Arabic tutorial with our current translator. Most of it was still from an old one that dropped examples and left lessons hard to follow. (#928)
- 🌐 Translating a project replaced your words instead of adding to them. A name you wrote with no language on it, like `speed`, was thrown away to make room for the new one, and the rest of your code was rewritten in the new language whether you wanted that or not. (#1276)
- 🌐 Sentences with an apostrophe in them, which is most French and Italian writing, quietly didn't translate at all. Your writing stayed in the language you started in with no explanation. (#1276)
- 🐛 Translating sometimes swapped a name for a picture, like turning `Phrase` into 💬, because it grabbed whichever name came first instead of a word. (#1276)
- 🐛 Rewriting a project in a new language only changed part of it: names like `size:` and `duration:` stayed in the old language, so the code ended up in neither one. (#1276)
- 🐛 Translating a project could break it. Words your program compares against, like the key name `'ArrowLeft'`, and pictures like `'🫀'`, were being translated too, so the program stopped working. They now stay exactly as you wrote them. (#1276)
- 🚦 When you translated a project, the names of your own structures weren't changed everywhere they were used, so your program filled up with errors. They're all changed now, and if translating would still cause errors, we leave your program alone and say so instead. (#1276)
- 🐛 A pattern that ignores capital letters for two languages at once, like `Aa/es_en`, stopped your program instead of matching. (#1301)
- 🌐 Patterns that ignore capital letters could give different answers on different computers, because they used whatever language the computer was set to. They now work the same way everywhere, and only follow a language's own rules when you name one. (#1301)
- 🐛 In the [Guide](https://wordplay.dev/guide), the page for joining two texts together didn't finish loading, so you couldn't read how it works. (#1301)
- 🌐 A translated name could turn out to be a word your language already uses for something built in, which broke the program. We now pick a different name. (#1276)
- 🐛 Once translating failed, the message about it stayed on screen forever, even after translating worked again. It goes away now. (#1276)
- 🖱️ On mice that scroll line by line, the scroll wheel didn't zoom the stage at all. It works now. (#1175)
- 🖱️ After scrolling past the closest the stage can go, scrolling back out did nothing for a moment. It now zooms out right away. (#1175)
- 🎨 The controls above the stage no longer jump in and out of the extra controls menu while you zoom. (#1175)
- 🚦 When you made the same mistake in more than one place — like spelling a name wrong ten times — we only marked one or two of them. We now mark every one. (#808)
- 🚦 A reaction that watches a stream handed to it by a function was told it had nothing to react to. That wrong warning is gone. (#808)
- 🐛 When one source shared a function and another source called it, reactions inside that function stopped reacting. They keep working now. (#808)
- 🐛 Writing the word `true` instead of the symbol `⊤` was quietly treated as false. Words like `true` now mean what they say, and `and` and `or` written as words now behave exactly like `&` and `|`. (#1296)
- 🌐 In a brand new project, or right after adding or removing a language, keyword words like `verdadero` weren't recognized until you reloaded the page. They now work the moment you type them. (#1296)
- 🐛 Writing the word for `~` in front of a value, like `not ⊤` or `no ⊤` in Spanish, did nothing. It now negates, exactly like the symbol. (#1298)
- 🌐 In nine languages, the words for `and`, `or`, and `not` didn't match the names of the functions they stand for, so writing them could fail. They now work in every language, and our checks keep it that way. (#1298)

## 0.29.2 - 2026-08-16

### Added

- 🌐 If you've never chosen a language, Wordplay now asks which one you'd like when you first visit. It asks in all 30 languages it speaks, so you can find yours even if you don't read English. (#1256)
- 🌐 You can now read a chat in your own language. Pick a language at the top of the chat and everyone else's messages show up translated underneath what they wrote. You can also say what language you're writing in. Some browsers can do the translating right on your computer, and when yours can, nothing gets sent to us. (#1214, #771)
- 🔠 We added a new example called Chamber to the [galleries](https://wordplay.dev/galleries). A hundred letters from four writing systems bounce around a sealed box, and you can turn gravity off or shake them all up again.
- 🔗 When you share a link to a public project or gallery, it now shows its name and description in chat apps and on social media. We also added a site map so search engines can find public projects and [galleries](https://wordplay.dev/galleries). (#1133)
- 🔊 We added a harmonica, and like most of our instruments it's a real recording rather than a synthesizer. Ask for it with `Instrument.harmonica` or `🔈.🌬️`.
- 📱 If you install Wordplay on an iPhone or iPad, it keeps its own projects, separate from the ones in your web browser. When you open the installed app and don't see your projects, Wordplay now explains where they are. (#564)
- 🔑 If your sign in link opens in your web browser instead of the Wordplay you installed, you can now paste the link into Wordplay to finish signing in. This also helps when you read your email on a different device. (#564)
- 🌐 Wordplay now checks that every translation still matches the English it was written from. When the English changes and the other languages fall behind, we find out that day instead of months later. (#1144)

### Changed

- 🌐 The [language chooser](https://wordplay.dev/) now spreads languages across the window instead of stacking them in one tall list, so you can see them all at once. (#1256)
- 🔍 Asking for a language we don't have yet is easier. Type a language or a country and the menus fill themselves in. (#1256)
- ⚡ We made programs with lots of moving output run three to five times more smoothly.
- 🔊 A song you bring in from a MIDI file now plays its harmonica and accordion parts on the harmonica, instead of turning them into a synthesizer.
- 🧲 We updated the physics engine. Things now rest on the ground instead of sinking into it, bouncy things settle instead of jittering forever, and output stops getting flung off the stage when it piles up.
- 🧲 @Collision now reports far fewer bumps while something is settling — a handful instead of hundreds. A project that counts bumps will count differently than it used to.
- 📹 The new Video example in the [galleries](https://wordplay.dev/galleries) paints your camera three ways — colored letters, ASCII shading, or colored squares.
- 🛠️ We upgraded internal tooling for stability.
- 🌐 Each language can now write down its own rules for how it should be written (e.g,. how to address the reader, which words to prefer, how to punctuate), and the helper that drafts new translations now follows them. (#939)
- 🎨 The message that shows up when we release a new version now looks like the other messages at the top of the page. It's grey instead of orange, since a new version isn't a problem, and its button and link sit at the end of the strip instead of floating in the middle.
- 🌐 When you install Wordplay as an app, it now shows up with its name and description in your language, and reads right to left in languages that do. (#564)

### Fixed

- 🌐 When you ask for a language someone already asked for, we now send you to that conversation instead of starting a new one. (#1256)
- 🐛 The “other languages” button on the front page no longer opens two language windows on top of each other. (#1256)
- 🤝 We fixed errors that filled a teacher's browser when they opened a student's project. Teachers now see students' edits live as they type, and students can see their teacher's cursor when they visit.
- 💾 For teachers with many galleries, the save light no longer flips between "Saved" and "Unsaved", the connection warning no longer comes and goes, and the [Teach](https://wordplay.dev/teach) page no longer goes blank.
- 🔑 If the sign in page failed to load, it used to stay broken until you restarted your browser. Now it shows when it's loading, says when it can't connect, and works again when you reload.
- ⌨️ When you press play while your code is still on screen, the keys you type now reach your project. Before, they could quietly change your code and drop you back into edit mode. (#1285)
- 🚦 When you give a check a name and use it later, Wordplay now remembers what the check proved. Naming a check that a value isn't `ø` no longer shows an error that writing the same check out didn't. (#1285)
- 🌐 Lots of text in other languages still described how Wordplay used to work, because the English was rewritten after it was translated and nobody noticed. We found more than 8,000 of these across all 29 languages and had them translated again. (#1144)
- 🌐 About a hundred pieces of text were marked in a way that made our translation helper skip them every time, so they never got fixed no matter how often we asked. They're unstuck now. (#1144)
- 📐 Output that shows up a moment after your project starts now gets centered and sized to fit the stage. Before, it could start off to one side, slide into place, or stay too big until you resized the window or started over.
- 🚦 Doing math with the hue of a color from the @Camera no longer stops your program with "incompatible values". Camera colors now carry the ° that hue is measured in.
- 🗣️ Screen readers can now read what a project puts in front of the stage, like a score or a row of buttons. That whole layer used to be skipped, so anything a project put there was silent and buttons there couldn't be reached.
- 🌐 We fixed many wrong and confusing words in Spanish. @Stage and @Beat have better names, tutorial titles that meant nothing now make sense, and questions and exclamations open with ¿ and ¡ the way Spanish is written. (#939)
- ⌨️ When you move around with the Tab key, the outline showing where you are is blue, and it used to disappear against orange and gold backgrounds that are just as bright. It now gets a second outline in a color that stands out, so you can always tell where you've landed.
- 🔗 When you share a link to the new Virtual Piano example, it now shows its name and description the way our other examples do. (#1288)
- 📖 We fixed the Spanish how-to guides. In half of them the spaces had gone missing, running words together and breaking the example code so it wouldn't run. (#939)

## 0.29.1 - 2026-08-13

This week we launched a new logo, improved the edit, debug, and play modes for more flexibility, and better organized the growing settings dialog.

### Added

- 🔣 The [Design](https://wordplay.dev/design) page now shows the new logo speaking fifteen writing systems, and lets you download it. (#414)
- 📱 On phones and tablets, a project that listens for certain keys now shows those keys as buttons on the stage, instead of opening the keyboard that covers your work. Wordplay reads your project to find which keys it uses, so arrow keys come out as an arrow pad you can steer with and letters come out as a row.
- 🚦 A list type can now say what goes in each place: `[# '']` means a list of exactly two things, a @Number and then some @Text. Wordplay checks that a list is that long and in that order, and it knows that the first thing in it is a number and the second is text.
- 💬 When a project speaks with @Say, the words now appear on the stage as a caption, white on black, so viewers who can't hear can read what was said. It fades a few seconds after the speaking ends, replacing the little icon that used to stay on the stage even after @Say went quiet.
- 🔠 You can choose how big captions are in settings, from three-quarters size to three times as big. The choice is saved on your device, since text size is about the screen you're using.
- ▶️ We added a perform button above the stage — a play triangle wrapped in full screen corners. It starts your program from the top, plays it, and fills the screen with the stage, and pressing it again starts the show over. Switching back to edit closes the full screen stage and brings your windows back just as you left them.

### Changed

- 💬 We gave Wordplay a new logo: a speech bubble that can say anything. On the [home page](https://wordplay.dev/) it speaks the letter of each language as the language chooser names it; while things load it holds a circle, a triangle, and a square that take turns hopping, like a crowd doing the wave; and it holds still if you turn animation off. (#414)
- ⚙️ We better organized the settings dialog, since it was getting log. It should be easier to find the setting you're looking for.
- 🖱️ The slider that moves through your program now gets a whole row to itself. While editing, it appears once your program has reacted to input and snaps between those moments; in debug mode it stops at every step, with the precise step buttons above it.
- 🐛 The pause mode is now called debug, keeping its two-bar pause icon, and the mode buttons above the stage go edit, debug, play. In debug, the value of each part of your program shows next to its code in the editor and next to its control in the palette.
- ⌨️ Ctrl-Enter switches between edit and play, and ctrl-alt-5, 6, and 7 jump straight to a mode. Ctrl-alt-Enter resets your program, in any mode.
- 📐 Switching modes no longer moves your windows around. You can keep the editor open while your project plays — the code wears a colored border so you know it's running — and leaving full screen gives you back exactly the windows you had.
- ▶️ Pressing play now always continues from wherever your program is, even after you edit — speech, music, and animations pick up where they left off instead of starting over. The perform and reset buttons are how you start from the beginning.
- ⏩ If you dragged back into your program's past, pressing play first fast-forwards through what already happened, so you can see how the present came to be, and then keeps going live.
- 📱 On small screens that show one tile at a time, switching modes now brings the right tile forward: play shows the stage, and edit and debug show your code. Entering a mode also expands its tile if you had collapsed it.
- ⏯️ When the stage tile is hidden — like on a phone showing one tile at a time — debug mode floats the step buttons and timeline over your code, so you can still step through your program.
- 👆 Tooltips no longer pop up and stay stuck on the screen when you tap on a touch screen. They appear on hover and on keyboard focus, where they can also go away.
- 🚦 A program with an error no longer jumps into debug mode when you press play. Only a new error that happens while playing does; one you can already see while editing stays where you can fix it.
- 🎨 The palette now stays on screen in every mode, with controls you can read but not change outside edit mode.
- 🎼 Captions and the touch keys now sit above the sheet music and the orchestra instead of covering them.

### Fixed

- 🐛 When you add something that listens for input — like a @Chat box — its controls now appear as soon as you finish typing, instead of waiting for the program's next change.
- 🐛 Refreshing the page while playing next to the editor no longer jumps back to full screen. The page comes back just as you left it.
- 🎨 A text box that isn't taking input right now, like the stage's chat box outside play mode, is dimmed with a dotted underline instead of looking just like an active one.
- 🔊 Restarting a project now speaks its @Say again and replays one-time music and entrance animations. Before, restarting stayed silent unless the words had changed.
- 🧲 Pausing no longer stops falling things cold. When you press play again, a moving object keeps the speed it had instead of starting its fall from rest.
- 🌐 If you picked a favorite voice for speech, words in other languages no longer come out garbled. Your voice is used only for the language it speaks.
- 🔊 Long speech no longer cuts off after about fifteen seconds in Chrome.
- 🔊 On iPhones and iPads, music stayed silent even after you tapped "Tap for sound". It now plays, even with the ringer switch set to silent, and it comes back after a phone call cuts it off.
- 🎤 On Android phones, a project that listens to sound kept asking to use the microphone over and over, even after you said yes. Now it asks once.
- 🖱️ Pages no longer scroll past their end. The bottom bar used to slide away and leave an empty screen if you kept scrolling on a long page like [Design](https://wordplay.dev/design).
- 📱 On iPhones and iPads, scrolling fast could leave the page blank until you reloaded, and the code could jump back down to your cursor while you were trying to scroll up. The page itself no longer scrolls, so Safari stops resizing everything while you swipe.
- ⌨️ Page Up, Page Down, Home, End, and the space bar scroll the page again, and they move it the same distance a browser does, smoothly, no matter what you clicked on last. If you asked for less motion, they jump instead.
- 🔠 On iPhones and iPads, the words in a doc sometimes came out a different size than the code around them. They now match, and they grow and shrink with the rest of your code when you zoom.
- 💡 You can now scroll the list of code suggestions with your finger. Picking one happens when you lift your finger, so sliding through the list no longer chooses something by accident.
- 💡 The list of suggestions no longer opens past the edge of your project, where you couldn't see it at all.
- 🎨 Tapping in the editor no longer paints a grey box behind what you tapped.
- 📐 The buttons for edit, debug, and play are now reachable when a window is full screen. Before, going full screen on your code left no way back to play.
- 🖱️ On iPhones and iPads, menus that let you choose one thing, like the layout chooser, showed a long run-on line cut off in the middle. They now show a short label.
- 🖱️ Tapping the ☰ button above your code no longer opens the first thing inside it right away, and the menu no longer covers the button you just tapped.
- 📱 On a phone, the box that explains your code took almost the whole screen. It now takes at most half, leaving room for the code itself.
- 📱 The project name at the bottom of the screen no longer takes a fifth of a phone's width.
- ⌨️ Home and End now jump the cursor to the start and end of the line in every text box in Wordplay. On a Mac, browsers treat those two keys as scroll keys, so our boxes now handle them; Command-Left and Command-Right still work too.
- 🖱️ Holding Page Down or Page Up now keeps turning pages smoothly. Before, holding one barely moved and stopped after about a page.
- 📱 You can now scroll your code with your finger in text mode. To pick out a stretch of code, hold your finger still for a moment and then drag — before, the smallest swipe selected text instead of scrolling.
- 🎨 The gold shape around selected code is now one clean outline per line, instead of growing little hooks, notches, and stray marks off the side. Blank lines you select show a small block, so you can see they're part of your selection.
- 📱 On iPhones and iPads, selecting code no longer leaves a grey smear and two round handles over your work.

## 0.29.0 - 2026-08-08

Lots of music and animation polish this week!

### Added

- 🎞️ We added ten more ready-made animations: `swing`, `blink`, `nod`, `dim`, `float`, `drift`, `orbit`, `glow`, `slidein`, and `slideout`. That makes thirty-five in all.
- 🚦 When you use a name Wordplay doesn't know, we now look for it inside things like @Sequence, @Color, and @Instrument, and offer to fix it for you — `sway` becomes `Sequence.sway`, `red` becomes `Color.red`, and `piano` becomes `Instrument.piano`.
- 🎵 Notes can now be numbers in between: `1.5` plays both the notes on either side of it, the closer one louder, like mashing two piano keys — and on a drum kit, both sounds at once. Set a @Track's `mash` to `⊥` to hear one note bent off pitch instead.
- 🎼 We added a music editor to the palette. Put your cursor on a song and you get a staff you can read, where you can click to add a note, drag one to move it, or change it with the arrow keys. (#390)
- 🎶 The editor changes one @Track at a time, with buttons for moving between tracks, adding and removing them, turning a note into a chord, and choosing how long a note lasts. (#390)
- 🎼 The staff shows every @Track at once, not just the one you're changing. The others sit behind it in grey so you can line a drum beat up against a tune, and they all go dark when you play the whole song. (#390)
- 🔁 A @Track that loops shows its repeats on the staff in grey, so you can see it come back around — and see that stop when you turn `loop` off. (#390)
- 🔊 You can hear a song while you write it, either the whole thing or one track on its own, and a line shows where the music has reached. (#390)
- 🎹 You can now bring in a MIDI file and Wordplay writes it out as @Track's of notes. It also tells you what it had to change on the way in, like a drum sound our kit doesn't have. (#390)
- 🎤 You can now hum or sing a tune and have Wordplay write down the notes. They appear while you sing, and we work out the key and the speed from what we hear. (#390)
- 🔊 We added a singing voice to the instruments. Give a @Track some `words` and `Instrument.voice` sings them, one syllable per note. Nobody recorded it — its mouth stays the same size however high or low it sings, which no real throat can do, so it sounds like a machine doing an impression of a person, and like neither a man nor a woman. (#390)
- 🔣 We added a button under the editor that shows every sound the voice can make. Each one comes with a word that has that sound in it and a button to hear it, and pressing the letter types it into your code. (#390)
- 🎼 @Beat now tells you which words are being sung on each beat, so you can put them on stage while the music plays. (#390)
- 📖 We added a how-to that teaches you how to spell words for the voice to sing, in the [Guide](https://wordplay.dev/guide). (#390)
- 🔊 Every act and lesson in [Learn](https://wordplay.dev/learn) now plays a short tune while its title is on screen, picked to match whoever the lesson is about. @Stage gets the lowest and loudest one, @Block's starts on a rest the way @Block starts every line with "…", and @None gets no tune at all. (#390)
- 🎼 We added a lesson about @Music to Learn. It starts with one voice and eight numbers, then changes the instrument, then the speed, then stacks up six voices at once, with words being sung and dots that move on every beat. (#390)
- 🎶 The dance at the end of Learn now has a band playing. The cast used to move to a clock; now they move to the beat of the music, and you still light them up by making noise. (#390)
- 🤖 We added Chatterbox, a little robot you can talk to, inspired by Eliza, the very first chatbot from 1966. It shows how to keep a chat log, spot patterns in what you type, and echo your words back with the pronouns flipped — find it with the other example projects in [galleries](https://wordplay.dev/galleries). (#380)
- 🎨 The [Design](https://wordplay.dev/design) page now explains our color rules — like never using color as the only clue — and its color table shows how strongly each color stands out against the background. (#1183)

### Changed

- 🎞️ The ready-made animations now belong to @Sequence, so you write `Sequence.sway()` where you used to write `Sequence(sway())`, and each one makes a whole animation by itself. You can still set how long it takes, how it eases, how many times it repeats, and what to call it, the same way as before. If you have a project that uses the old names, Wordplay will offer to fix it for you.
- 📖 Every ready-made animation now says what its motion looks like and when to reach for it, and comes with an example you can run in the [Guide](https://wordplay.dev/guide).
- 🎨 The stage stays clean while you work: the outlines around your output only show up when the palette is open. Double-click anything on the stage to open the palette and pick it, and the things you haven't picked now have a dashed outline, so the one you did pick stands out.
- ⚡ We made editing much faster, especially in big projects. Wordplay was redoing a pile of work on every key you pressed, including for parts of your project you weren't touching at all. (#1265)
- 🖱️ In step mode, the slider that moves through your program now gets a whole row to itself, instead of being squeezed into a small box next to the buttons. You can also drag the line itself to move through time.
- ✍️ Tidying your code now breaks up long lines. A @Phrase with lots of inputs, or a long list, set, or map, gets one thing on each line instead of running off the side of the screen.
- ⌨️ The edit, play, and pause buttons are now in that order, and their keyboard shortcuts changed. Ctrl-Enter now switches straight between edit and play without stopping at pause on the way, and ctrl-alt-P pauses.
- 🏷️ The buttons along the bottom that show and hide parts of your project now say what they open, like "show source main" or "hide palette", instead of just "show" and "hide".
- ⚡ Tidying a big project is now about three times faster.
- ✍️ When you type in text mode, Wordplay no longer fills in bits of code with blanks that your next keystroke would wipe out. Typing `(` after a name now just adds the closing `)`, instead of a set of inputs you never asked for.
- 🧩 Blocks editing still fills in those blanks for you, since code there has to stay whole.
- 🧩 Blocks editing no longer stops you when an edit would make a mistake like a wrong type or a name it doesn't know. The edit lands and the mistake shows up in red for you to fix, the same as typing. Only edits that would truly break the code's structure are still stopped.
- 🧩 More kinds of code can now be built in blocks editing: table rows, type variables like `⸨T⸩`, sharing with `↑`, borrowing with `↓`, notes on a conversion, a language tag on a name, and bold or italic writing in docs.
- 🖱️ When you drop a piece of code somewhere it can't go, Wordplay now always tells you why, even if you let go quickly. And a drop lands on the spot that makes the most sense, not just the thing right under your pointer.
- 🚦 Errors and warnings now differ in more than color: errors get solid lines, warnings get dotted ones, and the conflict list says "error" or "warning" in words. Before, the two were shades of orange and gold that can look the same to many people. (#1183)
- 🎨 We made keyboard focus easier to see everywhere: the focus blue is a little darker so it stands out, and controls that used to only change color when focused — like the stage's rotate and resize handles — now show a ring too. (#1183)
- 🎨 More places now show their state with a shape or a word instead of color alone: a source with an error wears a ⚠️, the languages you picked for translation get a ✓, and search matches in the guide are highlighted instead of just recolored. (#1183)

### Fixed

- 🎮 We fixed the Where's Waldough game: the 🔁 button now shuffles everyone to new hiding spots, and finding Waldough only scores one point per round. (#1095)
- ✍️ Moving your cursor onto code that makes output no longer takes your typing away from the editor. Before, your next arrow key moved the output instead of the cursor.
- 🐛 Removing a `↓` borrow from a program used to leave the code mangled instead of removing it. Same for adding one.
- 💡 Some menu suggestions used to save different code than they showed — like putting `1 + _` inside a function's inputs, where it reads as separate inputs. Wordplay now checks every suggestion and only offers ones that mean what they say.
- 📝 We fixed typing over a closing mark Wordplay had already added for you. Typing a `”`, `¶`, `/`, or `⎦` that was already there sometimes added a second one.
- 📝 A `\` typed inside writing now adds its closing `\` too, so the marks in the code you put between them stay where you put them.
- 🌙 We fixed links in documentation that you couldn't see in dark mode. They were the same color as what was behind them, so they looked like blank gaps. (#1216)
- 🎼 The sheet music now keeps up when you change a @Track's instrument. Before it kept drawing the instrument you switched away from, or stacked every one you had tried on top of the others.
- 🌐 We fixed how-to's never getting translated. Once a how-to had been copied into a language in English, we treated it as already done and skipped it forever.
- 🐛 A function marked with ↑, so it belongs to a structure instead of to one of its things, can now use names from outside that structure. Before it could only see the structure's own parts, and using anything else stopped your project when it ran.
- 🌐 We fixed two words that meant two different things at once: gray and brown were both "खैरो" in Nepali, and two of the fade-out animations shared one name in Swedish. We now check for this everywhere a name lives inside something else, so it can't happen again.
- 🔊 A note that wasn't a whole number, like `1.5`, used to stop a song from playing at all. Now it plays.
- 🔊 The little speaker in the corner of the stage no longer spins forever. It now goes away once a song's sounds have finished downloading, instead of waiting until you press play.
- ✍️ We fixed typing into a @Phrase on the stage. Letters came out backwards and quote marks piled up after every key you pressed; now it works like a normal text box, and Escape or Enter gets you back out.
- 📝 You can now type an apostrophe in your text, like in `don't`, without breaking your project. Wordplay picks a different pair of quote marks to hold the text when it needs to.
- 📐 An empty @Phrase used to leave the stage blank, with nothing to click on and no way back in. Now it shows an empty box where the text will go, in the same spot the words would sit.
- 💡 Typing `[` or `{` when a piece of your code is picked now puts your cursor between the two brackets, ready for you to type. Before it picked the whole new list or set, so the next thing you typed replaced it.
- 💡 Typing `{` right after a list now makes a set. Before, almost any bracket or quote mark typed after a list turned into a way of pulling one thing out of the list instead.
- 🐛 Long files no longer go blank as you scroll. If your code held a folded list, like a song with lots of notes, the rest of your code could disappear and never come back.
- ✍️ Tidying no longer pulls your first line of code up onto the end of your notes.
- 🏷️ A button's tip now changes as soon as you press it. If you kept your mouse still, it kept offering the thing you had just done, like saying "show" on something already showing.
- 🧱 A song and a @Phrase in the same program used to leave a tall empty box around your words and push them off center. @Music and @Say now take up no room on the stage, since you hear them instead of seeing them.
- 📐 The warning about flashing or moving pictures used to get cut off in the small examples in the [Guide](https://wordplay.dev/guide), hiding the start button. Now the words shrink and scroll, and the button stays at the bottom where you can always reach it.
- ⚡ Learn got slower the longer you used it, and could freeze the tab. Every act left its title card running in the background forever, and each step you took rebuilt the whole lesson twice, even when the code hadn't changed.
- 🚦 We fixed the example in the how-to about drawing music. It looked fine, but stopped as soon as a note played, because the height of each dot was measured in `semitones` and the rest of the math wasn't. (#390)
- 🌐 Twenty-eight languages were missing the Patterns lesson, and some were missing pieces of other lessons too. Wordplay now checks that every language has the same lessons as English and adds what's missing, ready to be translated.
- 🧱 Anything you make next to a @Stage now goes onto it. Before, only the stage happened, so a song beside it never played and a @Phrase beside it never showed up. (#390)
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
- 🎨 When you pick something on stage, it and its code now get the same glowing border, with the light moving around the edges. Before, the stage drew a dotted line and the code drew an underline in a different color, so it was hard to tell they meant the same thing.

### Fixed

- 🖱️ Clicking something on stage no longer moves it by accident. A click had to be perfectly still, so the tiniest wobble counted as a drag and changed where your output sat.
- ✍️ Picking something on stage now stops being picked when you move your cursor out of it in the code. It also stops when you close the palette, instead of leaving a glow around code with nothing to explain it.
- 📖 Examples in the [Guide](https://wordplay.dev/guide) now open ready to read, instead of stopped part way through running and showing half-finished values. They also play their music when you press play.
- 🔣 A name made only of symbols, like @Note's `♪`, now shows its written name with the symbol beside it, the way every other name does.
- 📖 We fixed how-to's in the [Guide](https://wordplay.dev/guide) whose examples didn't work: a few had code with mistakes in it, and translated ones had words run together so links to other pages broke. We now check every how-to example, so a broken one can't slip in again.

## 0.27.0 - 2026-08-01

This week we worked on screen reader accessibility!

### Added

- 🗣️ Screen readers now say what changed in your project's output, instead of naming it once and going quiet. When a project keeps making the same kind of output, we name the part that changed and its new value, like "eyesOpen true," and we round numbers so changes too small to matter stay quiet.
- ⌨️ Every keyboard shortcut in the editor now says something out loud. Before, some of them did their work in silence, which sounds the same as nothing happening at all.
- 🖱️ Clicking in your code now says where the cursor landed, so you hear the same thing whether you move with the arrow keys or with the mouse.
- ⌨️ The editor now echoes your typing to screen readers the way an ordinary text box does — every letter and deletion, right away, with no alert sound. (#1248)
- 📖 The little label that follows your cursor, and the speech bubble beside the editor, now show the same short explanation the autocomplete menu shows: the first sentence of that code's documentation, links included.
- 🧭 When something on stage moves, we now say which way it went and where it landed — "cat moved up and right to 2m 1m" — instead of just "moved." Movements too small to see stay quiet. (#149)

### Changed

- 🗣️ Everything Wordplay says out loud now comes from one place and takes turns. Answers to a key you pressed — the letter you typed, where the cursor is, an edit we couldn't make — speak right away, and news like a finished download waits its turn, so two messages can't talk over each other.
- 🌐 When you pick more than one language, spoken labels now use only your first one. Before, a screen reader read every language you picked, one after another, on every single button.
- ✍️ When you help translate a sentence that counts things, we now give you a slot for each way your language counts, show a number that goes with each one, and show what your words will say for each. (#1250)
- 🗣️ We rewrote how every kind of code describes itself, in one consistent style: values say what they are, like "5 meters" or "true," and expressions say what they do, like "evaluate Phrase" or "conditional on true".
- 🔣 Screen readers no longer speak an emoji when code also has a written name — a function named both 💬 and Phrase now says "Phrase." Emoji are only spoken when they're the only name something has.
- 🗣️ Names written as one word, like `eyesOpen`, are now read as separate words — "eyes open" — so they're possible to follow out loud. The code is unchanged; only the description is.
- 🗣️ Code that holds other code now describes what's inside it, not just what kind of thing it is. A test used to be described as "conditional on boolean type," which is true of every test ever written; now it says "conditional on operation greater than on n and 3". (#555)
- 📖 The parts of an explanation now say what they hold, instead of every one of them sounding alike. An explanation says its language and how many words it has, a paragraph and its words say their text, and an example says its code. (#1252)
- 🔍 The parts of a pattern now say what they hold too: a capture says its name, an exact text says its characters, and a range says its two ends. (#1252)
- 🔊 Keys you press while a project is playing no longer interrupt the description of what the project did in response, and no longer come with an alert sound. You already know which key you pressed; what the program did is the part worth hearing.
- 💡 Typing an operator like `~` or `-` where a piece of code is missing now adds a blank for what it needs and puts your cursor on it, so `~` becomes `~_` waiting to be filled in. It works everywhere code is expected — an empty program, inside `(` or `[`, or after another operator like `⊤ &`.
- 🚦 A reaction you haven't finished writing now says which part it's waiting for — "missing condition" or "missing next value" — instead of "unreadable code". It also runs: it just stays at its starting value until you finish it, so the rest of your project keeps working while you type.

### Fixed

- ✍️ We fixed projects freezing when you changed their code while they were playing.
- 🎨 We made text that was too faint to read easier to see — links, error messages, and greyed-out words are darker in light mode and brighter in dark mode. We also added a test so a new color can't slip below what's comfortable to read. (#1183)
- ✍️ We fixed the editor saying nothing when you delete. Each press of delete now speaks the character it removed, and bigger deletions say everything that disappeared.
- 🐛 We fixed the editor saying "Unparsable template" out loud when your cursor reached the end of a line.
- 🐛 We fixed screen readers saying a meaningless number when your cursor landed on a `$name` inside an explanation. Now they say the name. (#1252)
- 🌐 We fixed counting words when there's only one of something: a list with one thing in it now says "list of 1 value" instead of "list of 1 values". Every language gets this, not just English — some need more than two ways to count, like Polish with four and Arabic with six. (#1250)
- 🌐 We fixed 545 broken links in the explanations across all 30 languages, which showed an empty box instead of the word they point to. Most broke because a link ran into the words right after it, in languages that don't put a space there. (#1245)
- 🌐 We fixed text in 26 languages showing bits of code, like `[$1|and]`, in place of a word. An automatic translation had moved a space, which broke the choice between words.
- 🪟 We fixed boxes that open over the page sending you back to the top when you closed them with the keyboard. Now you land back on the button you opened them with.
- 📄 We gave every page a title, so browser tabs and screen readers can tell you which page you're on.
- 🗣️ We fixed screen readers saying what's on stage twice — once as "output phrase hi" and then again as "new phrase hi." Now you hear it once, in the stage's own words.
- 🤫 We fixed the stage describing itself out loud while you edit, and while a lesson reads its words. It now waits until you press play, so it can't talk over your typing.
- 🧱 We fixed shapes and groups on stage not being named out loud — you'd hear the word "new" and nothing after it. They're now described just like phrases are.
- 🐛 We fixed the screen reader's selection outline being far bigger than the program when selecting code. It now draws close to the code you selected.
- 🐛 We fixed expressions like `-1` describing themselves to screen readers as a broken template instead of what they are.
- 🌐 We fixed text that hasn't been translated yet showing a "to be determined" message in other languages. It now falls back to English until a translation is written.
- 🗣️ We fixed a project that changes a lot at once — a whole grid repainting — reading out every single change. It now says how many changed, where, and one example, like "12 outputs changed in my grid, like 5." (#555)
- 🗣️ We fixed descriptions ignoring the description you write yourself on a @Phrase, @Group, or @Stage. Yours is now the one that gets read.
- 🐛 We fixed some descriptions having a doubled space in them, like "number type in m".
- 🌐 We fixed unit names always being described in English, no matter which language you use.
- ✍️ We fixed the editor getting stuck on an orange "oops, there was an error" box when you typed `~` at the end of your code. Typing it there built a piece of code that could never work, and drawing that broke the editor.
- 🐛 If the editor ever can't draw your code, the box that appears now says what went wrong and gives you a button to try again, instead of leaving you with no way out.
- 🎨 We fixed the mark that shows where code is missing. It was a small orange box that sat on top of the code next to it; it's now an underline in the gap, level with the underlines on the rest of your code.

## 0.26.3 - 2026-07-25

### Added

- 📦 We added `@Objects`, a new input that uses your camera to spot everyday things — like a cup, a book, or a phone — and names what it sees in your language. It can find about 80 kinds of things at once, telling you how sure it is and where each one is on the screen.
- 🔍 We added [Show and Tell](https://wordplay.dev/project/example-ShowAndTell?mode=play), a new example in the Games gallery: it asks you to find three things and hold each up to your camera — the last one needs two people — and celebrates with a burst of confetti when you win.
- ⏸️ We added a pause symbol that shows over your project's output whenever it's not playing, so it's clear why things like a clock or animation have stopped. It rests in the corner out of the way, grows with the size of the output, and picks black or white to stay easy to see against your background.
- 🌐 We added a term list for people translating Wordplay. You can give a word a short key and reuse it everywhere by typing that key after a $, so the same word stays the same across all the text and you can change it in just one place. Keys can be in any language. (#1226)
- 🤝 We added remixing. When you make your own copy of a project, we remember where it came from and show a link back to it, so the person who made the original still gets credit. The sharing box tells you what a project was remixed from, and shows any remixes of yours that people have shared. (#788)
- 🔣 The character picker can now find your [custom characters](https://wordplay.dev/characters). Type part of a character's name or what it's about, and it appears with the matching emoji and symbols. (#669)

### Changed

- ⏳ When a project uses the camera to track hands, faces, or things, we now show how far along its model download is and wait to start until it's ready. The download begins while you're deciding whether to share your camera, so there's less waiting.
- 🗂️ Places that switch between different kinds of content now use tabs — the [Guide](https://wordplay.dev/guide), the page for translating Wordplay, the feedback form, and the character picker. The tab you pick joins the content below it, so it's clear which one you're reading.
- 🖼️ We split [Galleries](https://wordplay.dev/galleries) into tabs — yours, examples, how-tos, and public — instead of one long page. Each tab has its own web address, so you can share a link that opens the one you mean.
- 🧭 On [Learn](https://wordplay.dev/learn), we moved the lesson picker, search, and the chooser for the language you already know below the quick and complete tabs. Each of them is about the tutorial you're reading, so they belong with it instead of with the page.
- ✍️ We renamed the "duplicate" button to "remix," and gave it a new symbol. Copying a project so you can change it isn't really making a duplicate. (#788)
- 🗂️ The sharing box now uses tabs — Gallery, Public, Preview, Privacy, and Remixes — instead of one long page. It holds still while you move between them, so the tabs don't slide away as you click.
- 📜 We explained on the [Rights](https://wordplay.dev/rights) page that projects you make public are shared under a Creative Commons license. Anyone can remix them, as long as they credit whoever made the original and share their remix the same way. (#788)
- 🔎 When you search in the character picker, a magnifying glass tab now appears and stays picked. Choosing a different tab clears the search.

### Fixed

- ⚠️ We fixed a problem when typing quickly could cause the editor to crash. We also added a safety net so a hiccup in one spot can't take down the whole editor. If something does go wrong, it now quietly fixes itself the moment you keep editing.
- 🐛 We fixed a link to a missing example project loading a page full of jumbled text. Now it simply tells you the project doesn't exist.
- 🔗 We fixed some text that showed "@wordplay" as plain words instead of a link you can click, like on the [donate page](https://wordplay.dev/donate).
- 🎨 We fixed links that were nearly invisible because they were the same color as their yellow background, like the help link that shows when you pick something in the editor. Now they're white with an orange underline, so they're easy to read.
- 🔊 We fixed a project that talks out loud with `Say` speaking when the page first loaded, even though the project was paused. Now it stays quiet until you press play.
- ⌨️ We fixed groups of choice buttons, like the dark and light mode picker in settings, needing a separate tab press for every button. Now you tab once to reach the group, then use the arrow keys to move through it.
- 🗣️ We fixed choice buttons telling screen readers their tooltip instead of the words you can see. Now they say their label, which also makes them easier to pick with voice control.
- 📏 We fixed drop-down menus cutting off their words while leaving empty space beside them. They now fill the whole width they take up.
- 📚 We fixed the lesson picker on [Learn](https://wordplay.dev/learn) looking empty at the start of an act. It now shows the lesson you're on.
- 💾 We fixed projects that couldn't be saved online piling up and never getting sent, while the save button still said they were saved. Now they're sent in smaller groups, one project that won't save can't hold back all the others, and the button tells you when something still needs saving and why.
- 🛟 We fixed Wordplay sometimes deleting a project from your device when your changes hadn't reached the cloud yet, or while you still had it open. Now it only removes a project from your device once your work is safely saved.
- 🎨 We fixed [custom characters](https://wordplay.dev/characters) with nothing drawn in them being invisible in the character picker. They now show as a dashed box, so you can tell they're there and still empty.
- 🔣 We fixed the character next to your name turning into plain text, like `@you/Star`, when the custom character it points to was deleted. Now it shows an empty box, the same as a missing character in a project.
- 🧲 We fixed `@Motion` ignoring the speed you gave it the first time a project uses physics. A group of things set to fly off at different speeds would drop together in a clump instead of spreading apart. (#1231)
- ▶️ We fixed projects freezing when you switched to pause, which goes back to the start, and then switched to play. The output went blank and never moved again. Now it plays.

## 0.26.2 - 2026-07-18

### Added

- ⚠️ We now warn you before a project plays if it might flash or move fast in ways that could be uncomfortable or even cause seizures for some people. This shows only for projects you're viewing, not ones you're editing, and you click Start to play them (#716, #1043).
- 👁️ We added sensor preview panels to monitor your camera and microphone in real-time, showing hand and face landmarks as dots, volume levels, and pitch detection as a moving line. This can help when you're debugging things involving the camera and microphone.
- 📌 We added an `overlay` to `@Stage` for a heads-up display — a list of content pinned flat to the screen that stays put no matter where the camera looks, so a score or label can hold a fixed spot.
- 👁️ We added a view button next to projects you can't edit, like those in someone else's gallery, so you can open their code and see how they work.
- 🐤 We added [Humming Bird](https://wordplay.dev/project/example-HummingBird?mode=play), a new example in the Games gallery to celebrate our new physics engine. Flap a little bird through gaps between stacks of emojis by clicking, pressing keys, or humming — the bird floats up to match the pitch of your hum!
- 🧟 We added [Heart Attack](https://wordplay.dev/project/example-HeartAttack?mode=play), a new example in the Games gallery: look out through the camera at a field of zombies, strafe left and right, and throw hearts to turn them all back into happy people before they reach you.
- 📊 We added [Code Gap](https://wordplay.dev/project/example-CodeGap?mode=play), a data visualization of data about gender differences in computer science degrees.
- 🔨 We added [Building Blocks](https://wordplay.dev/project/example-BuildingBlocks?mode=play), a new example in the Games gallery: chop trees and boulders into wood and brick, then stack the pieces to match a faded outline. You can only reach one block above your feet, so hop or build a step to get at anything higher.
- 📽️ We added [Slide Show](https://wordplay.dev/project/example-SlideShow?mode=play), an example that shows how to make a series of slides navigable with the keyboard.
- 📖 We added a how-to in the [Guide](https://wordplay.dev/guide) that shows how to move between content with the arrow keys, using a list of things to show, `@Key`, and a number that remembers where you are. Before, the Guide explained how to react to letter keys, but not arrow keys (#756).
- ◫ We added a quick way to change the project layout in the project footer. Faster than going to settings! It also explains what layout is active.

### Changed

- 🌐 We improved the Japanese, Marathi, and Bengali translations, making them more consistent with the platform and it's terminology.
- 🎛️ We changed how projects run with a new three-mode switcher above the stage: ✏️ edit freezes the stage while you change your code, ⏸️ step lets you move through your program's evaluation with a timeline, and ▶️ play fills the screen and runs your project live. If your program has an error while playing, it now switches to step mode so you can see what went wrong (#859, #864).
- 🧲 We replaced the physics engine that powers `@Motion` and `@Collision` with a faster one, so projects with lots of moving and colliding things run more smoothly, especially on slower computers. Falling, bouncing, and rolling should feel mostly the same as before, though projects that use these might need a bit of tuning.
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
- 🔣 We fixed how we read number characters in Chinese, Japanese, and Korean, so everyday words that start with one — like 四角形, which means rectangle — now work as names. Before, we read the 四 as the number 4 and split the word in two.
- 🌐 We fixed a bug where switching between two versions of the same language — like Chinese (Simplified) and Chinese (Traditional) — could show you the other one's names for things.
- 🚦 We fixed `find` and `until` on lists: giving them a function to check each item always showed an error, even when the function was right. They now take a check just like `filter` does.
- 📐 We fixed `@Stack` so content with a small `padding` lines up in a row. Before, anything that landed close to the bottom piled into the same spot.
- 🎞️ We fixed zooming on the stage: after you zoom in yourself, switching back to "fit zoom to content" now lets a project move its own `@Stage` camera again. Before, it stayed stuck on your last zoom.

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
