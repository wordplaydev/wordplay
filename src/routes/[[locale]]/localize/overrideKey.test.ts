import { expect, test } from 'vitest';
// The submit function's own copy of the parser. `functions/` compiles with its
// own `rootDir`, so it can't import this side; this side can import it, which
// is what lets one table hold both to the same contract.
import { parseOverrideKey as parseOnServer } from '../../../../functions/src/localeEditPaths';
import parseOverrideKey from './overrideKey';

/** Every key shape the workspace can put in a bundle, and where it points. */
const cases: [string, string, number | undefined][] = [
    ['ui.localize.button.edit', 'ui.localize.button.edit', undefined],
    ['ui.page.localize.tabs.labels.0', 'ui.page.localize.tabs.labels', 0],
    ['ui.page.localize.tabs.labels.12', 'ui.page.localize.tabs.labels', 12],
    // A whole list is edited as one thing, so its key has no index tail.
    ['glossary.parameter.forms', 'glossary.parameter.forms', undefined],
    ['glossary.sideEffect.forms', 'glossary.sideEffect.forms', undefined],
    // A top-level field serializes with a leading dot, and keeps it.
    ['.guidance', '.guidance', undefined],
    ['terms.program', 'terms.program', undefined],
    // A changelog entry's key. The id is hex with a leading letter precisely so
    // this never resolves as `entries[…]` — an all-digit tail is read as an
    // array index, and the edit would be written into a string.
    [
        'updates.entries.e5b0f8fa8a89d',
        'updates.entries.e5b0f8fa8a89d',
        undefined,
    ],
];

test('the workspace and the submit function parse a key the same way', () => {
    // A drift between the two parsers would land a contributor's edit somewhere
    // else in the locale file, so it has to fail here rather than in production.
    for (const [key, path, index] of cases) {
        expect(parseOverrideKey(key)).toEqual({ path, index });
        expect(parseOnServer(key)).toEqual({ path, index });
    }
});

test('a changelog id is never parsed as an array index', () => {
    // `textId` prefixes every id with `e`, so this holds by construction; the
    // test is here because the consequence of losing that is silent — the edit
    // is applied to `entries` as if it were a list and the entry is lost.
    for (const id of ['e0000000000000', 'e1234567890ab'])
        expect(parseOverrideKey(`updates.entries.${id}`).index).toBeUndefined();
    // What it would do without the prefix, for contrast.
    expect(parseOverrideKey('updates.entries.1234').index).toBe(1234);
});
