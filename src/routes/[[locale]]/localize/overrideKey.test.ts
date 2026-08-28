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
];

test('the workspace and the submit function parse a key the same way', () => {
    // A drift between the two parsers would land a contributor's edit somewhere
    // else in the locale file, so it has to fail here rather than in production.
    for (const [key, path, index] of cases) {
        expect(parseOverrideKey(key)).toEqual({ path, index });
        expect(parseOnServer(key)).toEqual({ path, index });
    }
});
