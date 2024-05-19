# Change Log

We'll note all notable changes in this file, including bug fixes, enhancements, and all closed issues.
Dates are in `YYYY-MM-DD` format and versions are in [semantic versioning](http://semver.org/) format.

## 0.9.395 2024-05-18

### Fixed

-   Enabled content security policy to enhance security.
-   Improved layout of example code output refresh.
-   Tidier spacing of project preview lists.
-   [#468](https://github.com/wordplaydev/wordplay/issues/468) Fixed example dragging from tutorial dialog.
-   [#465](https://github.com/wordplaydev/wordplay/issues/465) Fixed ARIA roles for output.

### Added

-   Added `Circle` and regular `Polygon` forms, which can be added to a stage as a background.

## 0.9.394 2024-05-11

### Fixed

-   Changed toggle button color to always contrast backgrounds
-   Defined foreground of footer to ensure button text is visible.
-   Reset stage output when locales change.
-   Signficantly reduced memory usage of edit history
-   Improved preferred spacing of compound data structures and blocks.
-   Faster and more correct and stable preferred spacing algorithm.

## 0.9.393 2024-05-04

### Added

-   [#451](https://github.com/wordplaydev/wordplay/issues/451) New project templates.

## 0.9.392 2024-04-29

### Fixed

-   [#450](https://github.com/wordplaydev/wordplay/issues/450) Tutorial typos!
-   [#444](https://github.com/wordplaydev/wordplay/issues/444) Fixed fullscreen background behavior.
-   [#452](https://github.com/wordplaydev/wordplay/issues/452) Fixed aggressive local project persistence causing slowdown.
-   Removed `Toggle.svelte` background color when off.
-   Restored preferred spacing on `CodeView`.
-   Removed padding from `ConceptLinkUI` for better guide typography.
-   Included text in whitespace in selection bounding box.
-   When deleting program node, also delete its preceding space.
-   Remove caret entry direction when selecting parent of caret.
-   Only highlight definitions and uses of caret position when inside a token.
-   Fixed incorrect placement of caret; it was assuming pretty printing.
-   Removed unused font preload.

### Added

-   Added description of the parent of the node the cursor is at.

### Maintenance

-   Upgraded to Dexie 4.0.4.

## 0.9.391 2024-04-20

### Maintenance

-   Updated Firebase

## 0.9.39 2024-04-06

### Fixed

-   Added emoji variation selectors to `PhraseView` to ensure proper rendering of color emoji on WebKit browsers.
-   Empty list values should have an undefined item type, not a never type.
-   Fixed types of Webpage stream, should have been number, not none.
-   Don't show project footer in tutorial when in non-editable mode.
-   [#410](https://github.com/wordplaydev/wordplay/issues/410): Fixed alignment of project preview glyphs.
-   [#420](https://github.com/wordplaydev/wordplay/issues/420): Avoid setting tutorial project name.

### Maintenance

-   Updated Svelte, SvelteKit, and Firebase versions.
-   Updated TypeScript to 5.4.

## 0.9.38 2024-03-30

### Fixed

-   [#422](https://github.com/wordplaydev/wordplay/issues/422): Improved performance of very long list, set, and map values.
-   [#423](https://github.com/wordplaydev/wordplay/issues/423): Improved design of tile expand/collapse.

## 0.9.37 2024-03-16

### Fixed

-   [#424](https://github.com/wordplaydev/wordplay/issues/424): Fixed text to list conversion grapheme segmentation.
-   [#425](https://github.com/wordplaydev/wordplay/issues/425): Prevent buttons from capturing keyboard focus on mouse down, in order to keep focus on stage and other components.

## 0.9.36 2024-03-10

### Fixed

-   [#405](https://github.com/wordplaydev/wordplay/issues/405): Fixed closures on property binds.
-   Fixed rendering of structure values, showing all bound values, not just input values.
-   Fixed structure value equality, comparing all bound values in scope, not just first level of scope.

## 0.9.35 2024-03-02

### Fixed

-   Moved `Chat` input box above stage output
-   Allow paste in `Chat` input box
-   Disabled automatic pretty printing.
-   Fixed list spread doc example.
-   Better unused bind conflict message.
-   Narrowed parsing of structure refinements to avoid conflicting with spreads in lists.
-   Account for documented expressions in bind recurrence relations.
-   More consistently concretize name types in binds.
-   [#402](https://github.com/wordplaydev/wordplay/issues/402): Fixed defect in page loading test.
-   Check for collisions even when there's no temporal stream, to allow for objects to collide even when not in motion.

## 0.9.34 2024-02-24

### Added

-   [#343](https://github.com/wordplaydev/wordplay/issues/343): Improved login feedback.
-   [#37](https://github.com/wordplaydev/wordplay/issues/37): Added match, e.g., `number ??? 1: 'one' 2: 'two' 'other'

## 0.9.33 2024-02-19

### Added

-   [#256](https://github.com/wordplaydev/wordplay/issues/256): Allow explicit space indicators to be shown or hidden.

## 0.9.32 2024-02-17

### Fixed

-   [#382](https://github.com/wordplaydev/wordplay/issues/382): Wait for gallery to be created before redirecting.
-   Don't show preview if there are no projects in a gallery.
-   Fixed text placeholder error, preventing empty gallery description from being rendered.
-   Better feedback on too many login failures
-   Added admin script to update user password
-   Fixed MIME type on NotoEmoji preload
-   More consistent list function names.
-   Slightly faster list creation.
-   Slightly faster number to list conversion.

## 0.9.31 2024-02-10

### Added

-   [#362](https://github.com/wordplaydev/wordplay/issues/362): Added elision syntax to allow temporary removal of code from parsing (e.g., removing `2` from `1 + *2* 3`). Also included a toolbar and keyboard command for quick toggling.
-   [#336](https://github.com/wordplaydev/wordplay/issues/336): Added basic syntax error resolution suggestions.

### Fixed

-   English tutorial typos
-   Maximum project name length in footer.
-   Maximum toggle length.
-   Anchor dialog close buttons when scrolling.
-   Added missing Source input documentation.
-   Restored duplicate name warnings.
-   Incorrectly formatted inline code in tutorial.
-   Fixed font on non-emoji toolbar symbol icons.
-   Remove confusing automatically inserted placeholder at end of programs.
-   [#374](https://github.com/wordplaydev/wordplay/issues/374): Allow deletion of selected placeholder.
-   [#381](https://github.com/wordplaydev/wordplay/issues/381): Removed confusing line break insertion behavior.

## 0.9.3 2024-02-03

### Added

-   [#23](https://github.com/wordplaydev/wordplay/issues/23): Source file output with `Source()`, allowing data persistence in a project.
-   Added support for page up and page down to navigate to start and end of source
-   Line breaks for long literals

### Fixed

-   Fixed list literal types in the presence of spreads (e.g., `[:list 2 3]`)
-   Fixed end command to go to end of last line.
-   Fixed direction of annotation toggle error.

## 0.9.21 2024-01-28

-   [#176](https://github.com/wordplaydev/wordplay/issues/176): TextFields can increment and decrement numbers.
-   [#364](https://github.com/wordplaydev/wordplay/issues/364): Enabled email enumeration protection.
-   [#361](https://github.com/wordplaydev/wordplay/issues/361): Fixed popup dismissal.
-   [#359](https://github.com/wordplaydev/wordplay/issues/359): Fixed error in windows build command.
-   [#365](https://github.com/wordplaydev/wordplay/issues/365): Enforce number of acts and scenes.

## 0.9.20 2024-01-20

### Added

-   [#76](https://github.com/wordplaydev/wordplay/issues/76): Added `Scene`, a new input stream for showing a sequence of optionally interactive output. This will make it easier to tell typographic stories.
-   [#130](https://github.com/wordplaydev/wordplay/issues/130): Added `Phrase.aura` to allow for text shadows on text.
-   Defined `[].shuffled()` for quick and easy list randomization.
-   Added ability to expand and collapse the editor annotations.

### Fixed

-   [#340](https://github.com/wordplaydev/wordplay/issues/340): Resolved nested formatting logic for text formatting.
-   Filled source output preview background with error color on exception values.
-   Distinguished color of docs and text.
-   Fixed rendering of example output in docs.

## 0.9.16 2024-01-13

### Fixed

-   [#340](https://github.com/wordplaydev/wordplay/issues/340): Corrected partial formatting edge case
-   [#341](https://github.com/wordplaydev/wordplay/issues/341): Fixed key overrides in MapLiteral.
-   [#342](https://github.com/wordplaydev/wordplay/issues/342): Fixed broken collaborator sharing button.

### Maintenance

-   Upgraded to SvelteKit 2.32.
-   Upgraded to Vite 5.0.11
-   Upgraded to Firebase functions 4.6
-   Upgraded to Pitchy 4.1
-   Upgraded types: matter-js, node, uuid

## 0.9.15 2023-12-22

### Added

-   [#310](https://github.com/wordplaydev/wordplay/issues/310): Added a new feature for detecting PII in projects and generating conflicts for them, as well as resolutions for marking text as not PII. When PII conflicts are present, projects aren't saved.
-   [#48](https://github.com/wordplaydev/wordplay/issues/48): Added basic support for conflict resolutions.
-   [#209](https://github.com/wordplaydev/wordplay/issues/209): Redesigned adjust buttons for literals.
-   [#276](https://github.com/wordplaydev/wordplay/issues/276): Added weight, italic, and underline formatting controls in palette.
-   Added explanations of save errors.
-   Require ARIA-label for checkboxes.

### Fixed

-   Subconcepts are now scrolled to properly when selected via a concept link.

### Maintenance

-   Improved error messages and converage of basis unit tests for conflicts.

## 0.9.14 2023-12-21

### Fixed

-   Toggle buttons no longer trigger twice on keyboard activation.

### Changed

-   [#305](https://github.com/wordplaydev/wordplay/issues/305): Redesigned auth for simplicity, removing email login option. Punted on account recovery.
-   [#303](https://github.com/wordplaydev/wordplay/issues/303): Require password on account deletion and password change.

## 0.9.13 2023-12-20

### Added

-   [#191](https://github.com/wordplaydev/wordplay/issues/191): Added moderation progess to moderation page.
-   [#235](https://github.com/wordplaydev/wordplay/issues/235): Pre-render static pages for speed and SEO.
-   [#269](https://github.com/wordplaydev/wordplay/issues/269): Added type guard support for list and map access.
-   [#257](https://github.com/wordplaydev/wordplay/issues/257): Infer structure input types from evaluate.

### Changed

-   [#220](https://github.com/wordplaydev/wordplay/issues/220): Less confusing use of writing mode. Removed global setting, changed editor to always be horizontal top to bottom, but respect priority script's horizontal direction, and added direction as attribute of individual outputs, groups, and stages.

### Fixed

-   [#251](https://github.com/wordplaydev/wordplay/issues/251): Consistent tutorial lesson drop down appearance.
-   [#330](https://github.com/wordplaydev/wordplay/issues/330): Labeled drop downs.
-   [#314](https://github.com/wordplaydev/wordplay/issues/314): Removed low opacity footer on fullscreen for accessibility.

### Maintenance

-   [#313](https://github.com/wordplaydev/wordplay/issues/313): Upgraded to SvelteKit 2, Vite 5, tsx 4.7.0, and related dependencies.

## 0.9.12

### Changed

-   Redesigned editor annotations to avoid obscuring on hovers.
-   Generalized mechanisms for time-based reactions in evaluations.
-   Guaranteee re-render on font load.

### Maintenance

-   Updated minor versions of Playwrite, ESLint, Jester, tsx, and Firebase
-   Upgraded to Prettier 3

## 0.9.11

### Added

-   Added support for ø coalescing (e.g., a ?? 1) [#36](https://github.com/wordplaydev/wordplay/issues/36).

### Fixed

-   Corrected caret position layout in the presence of tabs.
-   Added tab insertion command and shortcut.
-   Fixed closures on block evaluations [#270](https://github.com/wordplaydev/wordplay/issues/270).

## 0.9.1

This version includes many other changes made prior to this log was created.

### Added

-   New change password form on profile.

### Changed

-   Improved design of username and password login [#272](https://github.com/wordplaydev/wordplay/issues/272), [#273](https://github.com/wordplaydev/wordplay/issues/273)
-   Converted blocks toggle to a keyboard/mouse switch.
-   Explicit switch control over localization of editor, instead of automatic.

### Fixed

-   Corrected English list literal tutorial, which didn't explain wraparound behavior of indices.
-   Decoded getWebpage response as JSON-encoded string, fixing HTML parsing and querying.
-   Keep editor caret displayed after losing focus to preserve menu location.
-   Fixed caret position of multilingual name renames.

## 0.9.0

Initial beta release.
