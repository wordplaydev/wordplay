# Change Log

We'll note all notable changes in this file, including bug fixes, enhancements, and all closed issues.
Dates are in `YYYY-MM-DD` format and versions are in [semantic versioning](http://semver.org/) format.

## 0.13.3 2024-12-14

### Added

- Added ability to change user interface font to one of the supported fonts.
- Fixed #604, adding a project chat feature to enable communication between project collaborators and gallery owners.
- Migrated to Sveltekit page state.

### Fixed

- Simplified login and join pages.

### Maintenance

- Updated minor versions.

## 0.13.2 2024-12-09

### Added

- Error boundary to prevent `TileView` errors from causing crash.

### Maintenance

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

### Maintenance

- Add svelte-check to CI.

## 0.13.0 2024-11-02

### Fixed

- Don't show expand/collapse toggle on guide.
- More consistent use of color and monochrome emojis.
- Removed several unused contexts.
- Faster caret movement by eliminating unnecessary recomputation.
- Fixed free form project layout.
- Corrected several invalid HTML issues for hydration.

### Maintenance

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

### Maintenance

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

### Maintenance

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

### Maintenance

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

### Maintenance

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

### Maintenance

- Upgraded to Dexie 4.0.4.

## 0.9.391 2024-04-20

### Maintenance

- Updated Firebase

## 0.9.39 2024-04-06

### Fixed

- Added emoji variation selectors to `PhraseView` to ensure proper rendering of color emoji on WebKit browsers.
- Empty list values should have an undefined item type, not a never type.
- Fixed types of Webpage stream, should have been number, not none.
- Don't show project footer in tutorial when in non-editable mode.
- [#410](https://github.com/wordplaydev/wordplay/issues/410): Fixed alignment of project preview glyphs.
- [#420](https://github.com/wordplaydev/wordplay/issues/420): Avoid setting tutorial project name.

### Maintenance

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

### Maintenance

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

### Maintenance

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

### Maintenance

- [#313](https://github.com/wordplaydev/wordplay/issues/313): Upgraded to SvelteKit 2, Vite 5, tsx 4.7.0, and related dependencies.

## 0.9.12

### Changed

- Redesigned editor annotations to avoid obscuring on hovers.
- Generalized mechanisms for time-based reactions in evaluations.
- Guaranteee re-render on font load.

### Maintenance

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
