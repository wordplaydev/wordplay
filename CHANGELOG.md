# Change Log

We'll note all notable changes in this file, including bug fixes, enhancements, and all closed issues.
Dates are in `YYYY-MM-DD` format and versions are in [semantic versioning](http://semver.org/) format.

## 0.9.11

## Added

-   Added support for ø coalescing (e.g., a ?? 1) [#36](https://github.com/wordplaydev/wordplay/issues/36).

## Fixed

-   Corrected caret position layout in the presence of tabs.
-   Added tab insertion command and shortcut.
-   Fixed closures on block evaluations [#270](https://github.com/wordplaydev/wordplay/issues/270).

## 0.9.1

This version includes many other changes made prior to this log was created.

## Added

-   New change password form on profile.

## Changed

-   Improved design of username and password login [#272](https://github.com/wordplaydev/wordplay/issues/272), [#273](https://github.com/wordplaydev/wordplay/issues/273)
-   Converted blocks toggle to a keyboard/mouse switch.
-   Explicit switch control over localization of editor, instead of automatic.

## Fixed

-   Corrected English list literal tutorial, which didn't explain wraparound behavior of indices.
-   Decoded getWebpage response as JSON-encoded string, fixing HTML parsing and querying.
-   Keep editor caret displayed after losing focus to preserve menu location.
-   Fixed caret position of multilingual name renames.

## 0.9.0

Initial beta release.
