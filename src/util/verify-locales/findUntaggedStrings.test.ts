import DefaultLocale from '@locale/DefaultLocale';
import { expect, test } from 'vitest';
import findUntaggedStrings from './findUntaggedStrings';

/** Regression guard for the locale-tag verifier: every user-visible string
 *  field must declare a format tag ([plain]/[formatted]/[name]/[emotion]) so it's
 *  editable in the localization editor and visible to translators. A new
 *  untagged field (or one whose own comment lacks a tag) fails here and in
 *  `npm run locales`. If this fails, tag the listed field(s) and regenerate the
 *  schema with `npm run create-schemas`. */
test('every user-visible locale string field has a format tag', () => {
    expect(findUntaggedStrings(DefaultLocale)).toEqual([]);
});
