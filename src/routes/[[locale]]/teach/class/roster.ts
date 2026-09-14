import { isMailableAddress } from '@db/creators/mailableAddress';
import { repairUsername, UsernameLength } from '@db/creators/username';
import { must } from '@util/nullable';
import type { ClassSigninMethod } from 'shared-types';

/**
 * How a teacher's pasted roster is read (#1347).
 *
 * The roster is a CSV of whatever columns help a teacher recognize their
 * students. In an email class the first column is the address those students
 * sign in with and the rest describes them, so the metadata columns the class
 * page shows survive and the username is built from them exactly as in a
 * password class.
 *
 * Positional rather than detected, because detection made the teacher's
 * decision implicit — it inferred from what was typed instead of asking, and it
 * implied a class could be half one thing and half the other, which no class
 * is. The form asks first; this only reads what the answer means.
 *
 * Pure, so it can be tested in milliseconds and so the form and the credential
 * generator agree about which cell is which.
 */

/** When a name can't be made out of anything the teacher gave us. */
const Fallback = 'learner';

/** The address on this row: the first column, in an email class. */
export function addressOf(
    row: string[],
    method: ClassSigninMethod,
): string | undefined {
    if (method !== 'email') return undefined;
    const cell = (row[0] ?? '').trim();
    return cell === '' ? undefined : cell;
}

/** Everything on the row that isn't the address, which is what names the
 *  student. In a password class that is the whole row. */
export function describingCells(
    row: string[],
    method: ClassSigninMethod,
): string[] {
    return method === 'email' ? row.slice(1) : row;
}

/**
 * Whether every line starts with an address, which an email class requires.
 *
 * A line that doesn't is the teacher's mistake and is said plainly, rather than
 * quietly becoming a password account — which is what made a roster of
 * addresses on a long TLD silently produce the wrong kind of class.
 */
export function everyRowHasAnAddress(rows: string[][]): boolean {
    return (
        rows.length > 0 &&
        rows.every((row) => isMailableAddress((row[0] ?? '').trim()))
    );
}

/**
 * A claimable base name from whatever the teacher gave us: the first few
 * characters of each of their other columns, or the address's local part when
 * the address is all there is.
 *
 * Repaired rather than passed through, because the reserved characters are
 * ordinary in a roster: `O'Brien, Mary` used to yield `o'bmar`, which
 * `isValidUsername` refuses, so `reserveUsername` answered `invalid` and the
 * whole class failed with "the username is not available".
 *
 * Padded by repeating the base rather than by appending a counter: a counter on
 * a one-character base never reaches UsernameLength, so the caller's uniqueness
 * loop would never terminate — and repeating keeps the name in one script,
 * which `isValidUsername` requires.
 */
export function baseUsername(
    cells: string[],
    email: string | undefined,
): string {
    // Repaired before it is shortened, not after: `O'Brien` truncated first is
    // `O'B`, which repairs to two characters, while repairing first keeps the
    // three the abbreviation is meant to have.
    const filled = cells
        .map((cell) => repairUsername(cell.trim()))
        .filter((cell) => cell !== '');
    const source =
        filled.length > 0
            ? // A copy, because `sort` mutates: sorting the caller's row would
              // silently reorder the teacher's metadata columns, which matters
              // now that a column is identified by index.
              [...filled]
                  .sort(
                      (a, b) =>
                          (/[0-9]+/.test(a) ? 1 : 0) -
                          (/[0-9]+/.test(b) ? 1 : 0),
                  )
                  .map((cell) => [...cell].slice(0, 3).join(''))
                  .join('')
            : // `split` always yields at least one part, even for an empty string.
              repairUsername(
                  must((email ?? '').split('@')[0], 'an address local part'),
              );
    return pad(source.toLowerCase());
}

function pad(name: string): string {
    const points = [...name];
    if (points.length >= UsernameLength) return name;
    if (points.length === 0) return Fallback;
    const repeated: string[] = [];
    while (repeated.length < UsernameLength) repeated.push(...points);
    return repeated.slice(0, UsernameLength).join('');
}
