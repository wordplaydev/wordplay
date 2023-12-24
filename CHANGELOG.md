# Change Log

We'll note all notable changes in this file, including bug fixes, enhancements, and all closed issues.
Dates are in `YYYY-MM-DD` format and versions are in [semantic versioning](http://semver.org/) format.

## 0.9.15 2023-12-22

### Added

-   [#310](https://github.com/wordplaydev/wordplay/issues/310): Added a new feature for detecting PII in projects and generating conflicts for them, as well as resolutions for marking text as not PII. When PII conflicts are present, projects aren't saved.
-   [#48](https://github.com/wordplaydev/wordplay/issues/48): Added basic support for conflict resolutions.
-   [#209](https://github.com/wordplaydev/wordplay/issues/209): Redesigned adjust buttons for literals.
-   [#276](https://github.com/wordplaydev/wordplay/issues/276): Added weight, italic, and underline formatting controls in palette.
-   Added explanations of save errors.
-   Require ARIA-label for checkboxes.

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
