import isValidEmail from '@db/creators/isValidEmail';

/**
 * The rules a username must satisfy to be *claimed*, and the fold that decides
 * whether two spellings are the same name.
 *
 * Mirrored at functions/src/username.ts, which is the authority — `functions/`
 * compiles with rootDir "src" and so cannot import this. usernameSync.test.ts
 * fails when the two disagree, the way noticeSync.test.ts does for MAX_NOTICES.
 */

/** Minimum length, in code points. Unchanged from the original rule: the number
 *  is quoted in the en-US join prompt, and raising it would strand accounts
 *  that already exist. */
export const UsernameLength = 5;

/** Maximum length, in code points. Comfortably under the 64 a character name
 *  may be, since a character is `username/Name` and both halves must fit, and
 *  short enough that CreatorView's 10-character truncation stays the exception
 *  rather than the rule. */
export const UsernameMaxLength = 30;

/** The two characters Unicode calls letters and Wordplay calls syntax: `ƒ`
 *  opens a function and `ø` is `none`, so both are ReservedSymbols and neither
 *  can appear in a name. A sweep of the BMP in username.test.ts asserts this
 *  set is still complete, so a future reserved symbol that happens to be a
 *  letter fails a test rather than silently making a username unlexable. */
export const ReservedLetters = 'ƒø';

const Charset = /^[\p{L}\p{M}\p{N}]+$/u;
const LatinRun = /^[\p{Script=Latin}\p{Nd}\p{Script=Inherited}]+$/u;
const AnyLatin = /\p{Script=Latin}/u;

/**
 * The key a username is reserved under, so `Alice` and `alice` cannot both
 * exist. `toLowerCase` rather than `toLocaleLowerCase` for the reason casing.ts
 * gives: a name must mean the same thing to every reader, and a Turkish-locale
 * machine would otherwise fold `I` differently.
 *
 * Deliberately not foldTagName, which also strips combining marks — that would
 * make `José` and `Jose` one name, and would collapse Devanagari names whose
 * matras are the whole difference between them.
 */
export function foldUsername(text: string): string {
    return text.normalize('NFKC').toLowerCase().normalize('NFC');
}

/**
 * Whether a username may be claimed. Stricter than what the tokenizer accepts,
 * on purpose, but never looser: username.test.ts proves every name this admits
 * also matches ReferenceNameRegExPattern, which is what makes the creator's
 * `@username/Character` references resolvable.
 *
 * Not applied to names that already exist — see isPlausibleUsername.
 */
/**
 * Note there is deliberately no "must start with a letter" rule. There was one,
 * on the grounds that a digit-leading name reads as a number — but the grammar
 * accepts one (`ReferenceNameRegExPattern`'s Latin branch includes `\p{Nd}`),
 * and three accounts already had such a name, one of them owning three
 * characters that resolve today. An aesthetic rule stricter than the grammar is
 * not worth breaking working references over.
 */
export function isValidUsername(text: string): boolean {
    const points = [...text];
    if (points.length < UsernameLength || points.length > UsernameMaxLength)
        return false;
    // NFKC-stable, which subsumes NFC and is what refuses a compatibility
    // spoof: full-width `Ａlice` and math-bold `𝐚𝐥𝐢𝐜𝐞` both fold onto `alice`,
    // so admitting them would let someone hold a name that displays as one
    // thing and reserves another.
    if (text.normalize('NFKC') !== text) return false;
    if (!Charset.test(text)) return false;
    if (points.some((c) => ReservedLetters.includes(c))) return false;
    // One script run, because ReferenceNameRegExPattern is `(?:Latin+|NonLatin+)`
    // — a mixed name like `aliceπ` lexes as `alice` and the rest is lost, so the
    // character reference would silently point somewhere else.
    return LatinRun.test(text) || !AnyLatin.test(text);
}

/**
 * The nearest claimable spelling of a name, or something still unclaimable when
 * there isn't one.
 *
 * Keeps only what a name may contain, because the reserved characters *are* the
 * problem. Mirrors functions/src/username.ts, which is what the repair script
 * and the server use; usernameSync.test.ts compares the two.
 */
export function repairUsername(name: string): string {
    return [...name].filter((c) => /[\p{L}\p{M}\p{N}]/u.test(c)).join('');
}

/**
 * Whether a username could belong to an account that already exists. Signing in
 * and adding a collaborator must keep accepting names the old rule allowed —
 * `_`, `-`, and `.` all passed it — or tightening the claim rule would lock
 * existing creators out of their own accounts.
 */
export function isPlausibleUsername(text: string): boolean {
    return (
        !isValidEmail(text) &&
        text.length >= UsernameLength &&
        !text.includes(' ')
    );
}
