import { describe, expect, test } from 'vitest';
import {
    findDialogDelimiterProblems,
    queuedForTranslation,
    repairConceptName,
} from '@util/verify-locales/verifyTutorial';
import type { Dialog } from '../../tutorial/Tutorial';

test.each([
    // A glued translation fragment truncates to the valid property.
    ['Boolean.andXYZ', [], ['and', 'or', 'not'], 'Boolean.and'],
    // The default tutorial's link at the same position wins, even for full translations.
    ['Pose.опацити', ['Phrase.exiting', 'Pose.opacity'], [], 'Pose.opacity'],
    // Ambiguous defaults (two links on the same concept) fall back to the prefix rule.
    [
        'Pose.rotationXY',
        ['Pose.opacity', 'Pose.rotation'],
        ['rotation', 'opacity'],
        'Pose.rotation',
    ],
    // The longest valid prefix wins.
    ['Phrase.namee', [], ['n', 'name'], 'Phrase.name'],
    // A different concept in the default and no prefix match is not repairable.
    ['Pose.kaliwanagan', ['Color.lightness'], ['opacity'], undefined],
    // A link with no property is not repairable.
    ['Pose', ['Pose.opacity'], ['opacity'], undefined],
])(
    'repairConceptName(%s, %j, %j) → %s',
    (
        name: string,
        defaults: string[],
        valid: string[],
        expected: string | undefined,
    ) => {
        expect(repairConceptName(name, defaults, valid)).toBe(expected);
    },
);

describe('queuedForTranslation', () => {
    test('$? and $! both queue a string', () => {
        // They disagreed before #1264: `$!` queued a locale doc but was a
        // silent no-op for a tutorial, so a full run translated none of them.
        expect(queuedForTranslation('$?Hello', false)).toBe(true);
        expect(queuedForTranslation('$!Hello', false)).toBe(true);
    });

    test('already-written text is left alone', () => {
        expect(queuedForTranslation('Hello', false)).toBe(false);
        expect(queuedForTranslation('$~Hello', false)).toBe(false);
    });

    test('override reaches machine-translated text, but not written text', () => {
        expect(queuedForTranslation('$~Hello', true)).toBe(true);
        expect(queuedForTranslation('Hello', true)).toBe(false);
    });
});

describe('findDialogDelimiterProblems', () => {
    /** A dialog line is `[character, emotion, ...paragraphs]`. */
    const line = (...text: string[]) =>
        ['FunctionDefinition', 'happy', ...text] as Dialog;

    test('a faithful translation has no problems', () => {
        expect(
            findDialogDelimiterProblems(
                line('Use \\1 + 2\\ here.'),
                line('$~Usa \\1 + 2\\ aquí.'),
            ),
        ).toEqual([]);
    });

    test('a dropped example pair is drift, and only warns for now', () => {
        // The ~190-line case: the translator rewrote "just use \+\" as prose,
        // so the reader is told about a symbol that isn't there.
        const problems = findDialogDelimiterProblems(
            line("But it's so much easier to just use \\+\\ for this."),
            line('$~Pero es mucho más fácil usar el signo más para esto.'),
        );
        expect(problems).toEqual([
            {
                index: 2,
                kind: 'drift',
                delimiter: '\\…\\',
                severity: 'warning',
            },
        ]);
    });

    test('an orphaned delimiter is a hard error', () => {
        // Shaped after the real es-MX act 3 scene 3: a closing `\` went missing,
        // so the example never ends and the rest of the line stops rendering.
        const problems = findDialogDelimiterProblems(
            line('This takes the set \\{1}\\, adds \\2\\ to it.'),
            line('$~Recibe el conjunto \\{1}\\, agrega \\2 después.'),
        );
        expect(problems).toHaveLength(1);
        expect(problems[0]).toMatchObject({
            index: 2,
            kind: 'orphan',
            severity: 'error',
        });
    });

    test('a string still queued for the translator only warns', () => {
        // `$?`/`$!` are acknowledged debt the next pass regenerates; `$~` is
        // written content, so it has to be correct.
        const source = line('This takes the set \\{1}\\, adds \\2\\ to it.');
        const broken = '$~Recibe el conjunto \\{1}\\, agrega \\2 después.';
        for (const marker of ['$?', '$!'])
            expect(
                findDialogDelimiterProblems(
                    source,
                    line(marker + broken.slice(2)),
                )[0],
            ).toMatchObject({ severity: 'warning' });
        expect(
            findDialogDelimiterProblems(source, line(broken))[0],
        ).toMatchObject({ severity: 'error' });
    });

    test('an unclosed text literal is caught even though the counts match', () => {
        // Real hi-IN act 7 scene 6: `\'बिली\` closes the example but never the
        // literal, so `mismatchedDelimiter` sees nothing wrong.
        const source = line("See how \\'cat'\\ isn't included in the list?");
        const broken = line("देखिये, \\'बिली\\ हमारी सूची में शामिल नहीं है?");
        expect(mismatchedCounts(source, broken)).toBe(false);
        expect(findDialogDelimiterProblems(source, broken)).toEqual([
            { index: 2, kind: 'unclosed', severity: 'error' },
        ]);
    });

    test("an external example's apostrophe is not our delimiter", () => {
        // `\py|…\` is Python; as-IN translating `else:` to `নহ'লে:` leaves
        // nothing of ours open.
        expect(
            findDialogDelimiterProblems(
                line(
                    "Compare: \\py|if x: print('more')\nelse: print('less')\\",
                ),
                line(
                    "$~তুলনা: \\py|if x: print('more')\nনহ'লে: print('less')\\",
                ),
            ),
        ).toEqual([]);
    });

    test('a line missing a paragraph is left to the structure sync', () => {
        // Comparing those per-index compares unrelated sentences, which invents
        // delimiter problems for what is really a missing-paragraph problem.
        expect(
            findDialogDelimiterProblems(
                line('Use \\1 + 2\\ here.', 'And \\3 + 4\\ there.'),
                line('$~Usa aquí.'),
            ),
        ).toEqual([]);
    });

    test('a formatted delimiter counts too', () => {
        const problems = findDialogDelimiterProblems(
            line('Write it `like this` instead.'),
            line('$~Escríbelo `así`` en su lugar.'),
        );
        expect(problems[0]).toMatchObject({
            kind: 'drift',
            delimiter: '`…`',
        });
    });

    /** Whether the two lines' `\` counts differ, to show what the check adds. */
    function mismatchedCounts(source: Dialog, translation: Dialog): boolean {
        const count = (text: string) => (text.match(/\\/g) ?? []).length;
        return count(String(source[2])) !== count(String(translation[2]));
    }
});
