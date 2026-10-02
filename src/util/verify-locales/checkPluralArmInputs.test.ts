import DefaultLocale from '#locale/DefaultLocale.ts';
import type LocaleText from '#locale/LocaleText.ts';
import LocalePath from '#util/verify-locales/LocalePath.ts';
import { collectingLog } from '#util/verify-locales/Log.ts';
import { expect, test } from 'vitest';
import checkPluralArmInputs from './checkPluralArmInputs';

/** A plural arm chosen by one count must not report another. */

// en-US: "$#rows[one row|$rows rows] of $columns columns"
const Summary = new LocalePath(['ui', 'source', 'add', 'table'], 'summary', []);

function withSummary(value: string): LocaleText {
    const copy: LocaleText = structuredClone(DefaultLocale);
    Summary.repair(copy, value);
    return copy;
}

function check(value: string, fix = false) {
    const { log, lines } = collectingLog();
    const revised = checkPluralArmInputs(
        log,
        DefaultLocale,
        withSummary(value),
        fix,
    );
    return { errors: log.errorCount, lines, revised };
}

test('a general form reporting another input is an error', () => {
    // pl-PL's table summary chose its arm by rows and then said the column count.
    expect(
        check(
            '$~$#rows[jeden wiersz|$columns wiersze|$columns wierszy|$columns wiersza], kolumny: $columns',
        ).errors,
    ).toBe(1);
});

test('the right input, with any number of arms, is fine', () => {
    expect(
        check(
            '$~$#rows[jeden wiersz|$rows wiersze|$rows wierszy|$rows wiersza], kolumny: $columns',
        ).errors,
    ).toBe(0);
});

test('a first arm without the number is fine, as English writes one', () => {
    expect(check('$~$#rows[una fila|$rows filas] de $columns').errors).toBe(0);
});

test('a language with one form still has to say the number in it', () => {
    // Its only arm is its general form.
    expect(check('$~$#rows[行] 列: $columns').errors).toBe(1);
    expect(check('$~$#rows[$rows行] 列: $columns').errors).toBe(0);
});

test('the declaration spelling inside an arm names the same input', () => {
    expect(check('$~$#rows[una fila|$#rows filas] de $columns').errors).toBe(0);
});

test('a queued string is left for the translation run', () => {
    expect(check('$!$#rows[one|$columns rows] of $columns').errors).toBe(0);
});

test('fix queues it and keeps the text', () => {
    const { revised } = check('$~$#rows[one|$columns rows] of $columns', true);
    expect(Summary.resolve(revised)).toBe(
        '$!$#rows[one|$columns rows] of $columns',
    );
});

test('other inputs carried inside every arm are fine', () => {
    // Spanish agrees the column phrase with the row count, so it moves into the branch.
    expect(
        check(
            '$~$#rows[una fila de $columns columnas|$rows filas de $columns columnas|$rows filas de $columns columnas]',
        ).errors,
    ).toBe(0);
});

test('the number written outside the branch is fine', () => {
    // as-IN chooses only the noun's form, with the count before it.
    expect(check('$~$rows ৰ $columns $#rows[শাৰী|শাৰী]').errors).toBe(0);
});
