# VoiceOver coverage of announcement lanes and primary-locale labels

These tests verify what no automated test can: what the app actually _sounds_
like. They cover the Announcer's four priority lanes (`announcerQueue.ts`),
the `role="status"` live region, the migrations off component-local
`aria-live` regions, and primary-locale-only `aria-*` text. Run them with
**VoiceOver in Safari on macOS** (VO has the most conservative live-region
behavior; what works here tends to work in NVDA).

**Setup for all tests:**

1. Start the app (`npm run emu` in one terminal, `npm run dev` in another, or
   any built deployment).
2. Turn on VoiceOver (⌘F5). Use a single UI locale (English) unless a test
   says otherwise.
3. Throughout every test, listen for three global failure signatures:
   an announcement spoken **twice in immediate succession** (the region's
   per-delivery node replacement double-announcing — a known risk to verify),
   and VoiceOver going **silent when something visibly changed**. Note that
   VoiceOver chimes before each keystroke's echo: the immediate region is
   assertive on purpose, since polite drops characters (see #1248, which
   replaces this mechanism with native text-field echo). The chime is
   expected; dropped or late characters are not.

---

# Character echo stays in order (echo lane)

_Typing code in the editor echoes every character, in order, with no drops._

1. Create or open a project and click into the code editor.
2. Type `1 + 2 + 3` at a comfortable pace.
3. Then type `aabb` as fast as you can.

VoiceOver speaks each character **as you press it**, with no perceptible lag —
compare it to typing in an ordinary text field, which should feel the same.
When you type faster than it can speak, the newest character cuts off the
previous one rather than queueing behind it. The doubled letters in `aabb` are
each spoken. Failure: echo trails your typing by a word or more, or characters
you typed never get spoken at all.

---

# Whitespace and deletions are echoed by name

_Keys that produce no sound of their own still announce._

1. In the editor, type a few characters, then press the space bar.
2. Press Return, then Tab (with tab-inserts-tab on in settings).
3. Press Backspace four times, one press at a time.
4. Select a whole line and press Backspace once.

Space, Return, and Tab each announce their name ("space", "new line",
"tab") — never silence. Each Backspace echoes the character it removed
(whitespace by name). The line deletion announces what was deleted, not just
where the caret ended up. Failure: any of these is silent, or a deletion
announces only a caret position.

---

# Every command says what it did

_No keystroke is silent, whatever it does._

1. In the editor, select some code and press ⌘C, then ⌘V.
2. Press ⌘Z, then ⌘⇧Z.
3. Press ⌘\ to switch between blocks and text mode, twice.
4. Press ⌘⇧< to fold all, then ⌘⇧> to unfold all.
5. Press a key that does nothing (e.g. ⌘J).

Each of these announces a result: what was copied and pasted, "undone" then
"redone", the editing mode now in effect, all folded / all unfolded, and a
reason for the key that did nothing. Then repeat step 3 using the toolbar's
mode buttons and the settings dialog — the announcement must be the same
however the mode is changed. Failure: silence after any keystroke.

---

# Caret navigation coalesces to the latest position (coalesce lane)

_Arrow-key navigation describes where you are now, not where you were._

1. In the editor, place the caret at the start of a line of code.
2. Press the right arrow ten times quickly.
3. Stop and wait.

While moving, VoiceOver may skip intermediate positions; within a moment of
stopping it describes the caret's **current** position. Then repeat step 2
right after something else has been announced (e.g. press ⌘Z first, then
arrow immediately): the caret still gets spoken — it interrupts rather than
waiting for the other announcement to finish. Failure: it plays back a
backlog of stale positions after you stop, describes a position you left
several presses ago, or goes silent while a status announcement or
VoiceOver's own "you are currently on…" is speaking.

---

# Pointing announces where you landed and what you selected

_A mouse or trackpad user with a screen reader hears the result too._

1. In the editor, click somewhere in the middle of a line of code.
2. Click a different token.
3. Click the same token again.
4. Drag across several characters to select them, and release.
5. Switch to blocks mode (⌘\) and click a token.

Each click announces where the caret landed — including the third click,
which lands somewhere that reads the same as a previous position (this is a
discrete action, so it isn't deduplicated away). The drag announces the
selection once on release, saying how many characters and what they say (e.g.
"selected 5 characters: 1 + 2"), not raw offsets. Clicking in blocks mode
announces too, even though focus moves into a token editor. Failure: silence
after any click, or a selection described only as "selection from 412 to
431".

---

# Rejected edits interrupt immediately, every time (interrupt lane)

_A keystroke that can't edit announces its rejection at once, even repeated._

1. Open a project you cannot edit (e.g., open another creator's public
   project from a gallery, or your own project in play mode where the source
   is read-only).
2. Click into the code area and press `x`.
3. Press `x` twice more, a second apart.

Each press announces the rejection (e.g., that the code is read-only)
**immediately** — it does not wait behind other chatter, and the second and
third identical rejections are spoken again, not deduplicated into silence.
This is the single most important interrupt test: "I acted and nothing
happened" must never be silent.

---

# A discrete action is heard during a continuous stream (starvation guard)

_Color dragging can't drown out a discrete action's feedback._

1. Open a project with a Phrase, select its output on stage, and open the
   palette's color chooser.
2. With the pointer, drag continuously back and forth across the color field
   for about five seconds, then — while still dragging or immediately on
   release — press Escape to clear the output selection (or activate any
   nearby control, e.g. a fold toggle in the editor).
3. Listen to the order of what's spoken.

During the drag, VoiceOver speaks intermittent color values (latest-wins, not
every pointer move). The discrete action's announcement (selection cleared /
fold state) is spoken **promptly, before further color values** — it is never
starved out or lost behind the stream.

---

# Tutorial dialog is announced per pause, never dropped (queued lane)

_Advancing the tutorial reads the new dialog through the central region._

1. Go to Learn and choose the quick tutorial.
2. Press the next button three times, pausing a beat between presses.
3. Then press next twice rapidly.

Each pause's dialog text is announced after each press — including both of
the rapid presses, in order (queued announcements are never dropped, only
paced). Failure: a pause's dialog is skipped entirely, or the whole dialog
area re-reads itself on every unrelated update (the old `aria-live` region's
behavior).

---

# Tour steps announce progress and explanation

_The guide tour speaks each step as one predictable utterance._

1. Open the Guide and start its tour (the ❓ affordance).
2. Press the next button twice.

Each step change announces once, in the shape "2/5:" followed by that step's
explanation. The first step (on open) is not announced — the dialog itself
takes focus and reads instead. Failure: silence on step change, or the
explanation read twice (once via focus, once via region — the panel is no
longer a live region, so this should not happen).

---

# A running program says what changed

_Continuous output describes its differences; an unchanging one goes quiet._

1. Create a project whose program is `Face()` (or any continuously
   re-evaluating stream) and press play.
2. Listen for several seconds.

You hear the output named once ("Face"), and then, about once a second, a
property that changed and its new value — "eyesOpen true", "place x 1.2",
"smiling false". Successive announcements name **different** properties rather
than the same busy one over and over. Failure: it announces "Face" once and
then nothing (VoiceOver won't re-read unchanged text, which is exactly why the
description has to change), or it repeats the same property every time.

Numbers are rounded to tenths, so a value drifting by hundredths says nothing
until it crosses a tenth. That's intended: imperceptible precision is noise.

Then try a program that produces a **scalar**: `Time()` or `1 + 1`. The
announcement says the value itself — "Output 3200ms", "Output 2" — not the
word "number". `1 + 1` describes itself once and then falls silent, because
nothing about it is changing. Silence means "nothing changed", not "paused" —
that's the deliberate trade for VoiceOver's refusal to re-read.

A list, set, or map announces just its type, then its changes by position or
key ("2 5", "b 3"), since reading a whole data structure aloud on every change
would bury you.

---

# The editor stays quiet while you're editing

_Stage output doesn't talk over the code you're reading._

1. Open a project in edit mode (not playing) and move the caret around the
   code with the arrow keys.
2. Then go to Learn, start a lesson, and let the dialogue read.

In edit mode you hear caret descriptions only — no stage output description.
In the tutorial, each dialogue turn reads to completion without being cut off
by a description of the lesson's example output. Failure: an "output …"
announcement interrupts either.

---

# Autocomplete suggestions say what they'd insert

_Choosing between suggestions requires hearing them apart._

1. In the editor, press ⌘↓ to open the autocomplete menu.
2. Arrow down through several suggestions.

Each suggestion announces the code it would insert followed by what it is
(e.g. "1 + 2, an addition"), so consecutive items are distinguishable.
Failure: every item announces only its type ("a reference", "a reference").

---

# The color chooser's band is adjustable

_The 2-D picker works with the keyboard, including lightness._

1. Open a project, select a Phrase, and open the palette's color chooser.
2. Tab to the color field. VoiceOver will describe it as a color field with
   instructions; interact with it (VO+Shift+Down).
3. Press Left/Right (hue), Up/Down (chroma), and Page Up/Page Down
   (lightness). Hold Shift for finer steps.

Each press announces the new color, and all three dimensions respond —
lightness included. The instructions read on focus mention interacting first
and name the sliders as an alternative. Failure: arrows move the VoiceOver
cursor instead (you never interacted), or Page Up/Down does nothing.

---

# A tour lands focus inside itself

_Opening a tour moves the reader into it._

1. In a project, press the ❓ button on a tile to start its tour.
2. Listen without pressing anything, then press Escape.

Focus lands on a control inside the tour and VoiceOver reads it. The page
behind stays explorable (the tour explains it). Escape returns focus to the
button that opened it. Failure: after opening, VoiceOver reads nothing or
stays on the page behind.

---

# Say output speaks once, not twice

_Program speech comes from the program's voice only._

1. Create a project whose program places a `Say` on stage, e.g.
   `Stage([Phrase('hi') Say('hello there')])`.
2. Run it (play mode) with VoiceOver on.

You hear "hello there" spoken **once**, in the app's chosen synthesis voice.
VoiceOver does not also read the same text (the Say chips are no longer in a
live region). The chips remain findable by VO cursor exploration, each
labeled with its text.

---

# Dialog focus returns to its opener

_Escape from a dialog puts keyboard users back where they were._

1. Tab to the notifications button (🔔) in the footer and press Return.
2. When the dialog opens, press Tab twice, then press Escape.

Focus lands back on the notifications button and VoiceOver announces it.
While the dialog was open, Tab stayed inside it. Failure: after Escape,
VoiceOver announces the page body or the first control on the page.

---

# Labels are primary-locale only; visible echoes remain multilingual

_With two locales chosen, controls are spoken once, in your primary language._

1. In the footer, use the language chooser (🌎) to add Spanish alongside
   English (English primary).
2. Tab through several footer and header controls (settings, notifications,
   the mode switches in a project).
3. For one control (e.g., a Checkbox in project settings), hover the pointer
   and read its native tooltip; also observe any visible text on the page.

VoiceOver speaks each control's name in **English only** — no "· Posición"
style second language appended. Visible page text and tooltips still show
both languages (English first, Spanish dimmed/joined). Announcements (e.g.,
tutorial dialog, mode changes) are also English-only. Failure: any focused
control or announcement is spoken in both languages back-to-back.

---

# Loading and model downloads announce as status

_Long-running loads are audible without being alarming._

1. Create a project that uses camera input (e.g. references `Hand` or
   `Face`), and run it, granting camera permission.
2. Listen while the model downloads.

The model download start is announced once (e.g., "Loading hand…"); the
spinner's label is exposed when the VO cursor lands on it but does not
interrupt anything by itself. Failure: repeated loading announcements every
frame, or total silence about the download.

---

# Account deletion confirmation is announced

_The dangerous confirmation prompt cannot appear silently. Requires a
disposable test account (use the local emulator, not production)._

1. Log in on the emulator as a throwaway account and go to the login/profile
   page's delete section.
2. Tab to the delete-account button and press Return.

The "really delete?" confirmation prompt is announced once as it appears,
and the confirmation form is reachable with Tab immediately after. Failure:
the prompt appears silently, or is announced repeatedly on unrelated
re-renders.
