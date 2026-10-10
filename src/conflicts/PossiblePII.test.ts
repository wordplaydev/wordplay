import { PossiblePII } from '#conflicts/PossiblePII.ts';
import { conflictsIn, testConflict } from '#conflicts/TestUtilities.ts';
import Doc from '#nodes/Doc.ts';
import FormattedTranslation from '#nodes/FormattedTranslation.ts';
import Translation from '#nodes/Translation.ts';
import { expect, test } from 'vitest';

// Personal information is flagged wherever a creator can write prose: text, formatted text, and
// docs. In markup a bare email address lexes as a link rather than as words, which hid it from
// the check in docs and formatted text until links were scanned for email too.
test.each([
    ["'write me'", "'jdoe@example.com'", Translation, PossiblePII],
    [
        '`write me`',
        '`write jdoe@example.com`',
        FormattedTranslation,
        PossiblePII,
    ],
    ['`call me`', '`call 206-555-1234`', FormattedTranslation, PossiblePII],
    ['¶write me¶\n1', '¶write jdoe@example.com¶\n1', Doc, PossiblePII],
    [
        '¶write me¶\n1',
        '¶write <me@mailto:jdoe@example.com>¶\n1',
        Doc,
        PossiblePII,
    ],
] as const)('%s ok, %s is possibly personal', (good, bad, node, conflict) => {
    testConflict(good, bad, node, conflict);
});

test("a web link's path is not a handle", () => {
    expect(conflictsIn('¶see <it@https://example.com/@amy>¶\n1')).not.toContain(
        'PossiblePII',
    );
});

// A concept link right after a Hebrew prefix or a period is still a link, not an address (he-IL and
// pl-PL gallery examples). The email rule matched an ASCII local part of just `-` or ending in `.`.
test.each(['¶צריך ב-@Music.replay¶\n1', '¶to faza.@Music.replay¶\n1'])(
    '%s has a concept link, not an email',
    (code) => {
        expect(conflictsIn(code)).not.toContain('PossiblePII');
    },
);
