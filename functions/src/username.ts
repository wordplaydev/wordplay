/**
 * The authority on what a username may be. Mirrored on the client at
 * src/db/creators/username.ts, since `functions/` compiles with rootDir "src"
 * and neither side can import the other; src/db/creators/usernameSync.test.ts
 * fails when the two disagree, the way noticeSync.test.ts does for MAX_NOTICES.
 *
 * The client copy validates as you type; this one decides. A name that reaches
 * joinAccount having skipped the form is checked here and nowhere else.
 */

/** Minimum length, in code points. */
export const UsernameLength = 5;

/** Maximum length, in code points. */
export const UsernameMaxLength = 30;

/** The two characters Unicode calls letters and Wordplay calls syntax: `ƒ`
 *  opens a function and `ø` is `none`. Both are ReservedSymbols, so neither can
 *  appear in a name, and a `@username/Character` reference containing one would
 *  not lex. */
export const ReservedLetters = 'ƒø';

const Charset = /^[\p{L}\p{M}\p{N}]+$/u;
const LatinRun = /^[\p{Script=Latin}\p{Nd}\p{Script=Inherited}]+$/u;
const AnyLatin = /\p{Script=Latin}/u;

/** The key a username is reserved under, so `Alice` and `alice` cannot both
 *  exist. Locale-independent `toLowerCase` on purpose: the fold must give the
 *  same answer on every machine that runs it. */
export function foldUsername(text: string): string {
    return text.normalize('NFKC').toLowerCase().normalize('NFC');
}

/** Whether a username may be claimed. See the client copy for why each rule is
 *  here; the two must stay identical. */
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
    if (text.normalize('NFKC') !== text) return false;
    if (!Charset.test(text)) return false;
    if (points.some((c) => ReservedLetters.includes(c))) return false;
    return LatinRun.test(text) || !AnyLatin.test(text);
}

/**
 * The nearest claimable spelling of a name, or something still unclaimable when
 * there isn't one.
 *
 * Keeps only what a name may contain, because the reserved characters *are* the
 * problem: `_`, `.`, `-`, `$`, and `&` are all Wordplay operators, so a name
 * holding one cannot be half of a `@username/Character` reference. Stripping
 * them is the entire repair, and anything more would be inventing a name the
 * creator did not choose — which is why the caller checks the result rather
 * than trusting it.
 */
export function repairUsername(name: string): string {
    return [...name].filter((c) => /[\p{L}\p{M}\p{N}]/u.test(c)).join('');
}

/** The domain appended to a username to make an address Firebase Auth accepts,
 *  since it has no username primitive. Mirrors
 *  Creator.CreatorUsernameEmailDomain; usernameSync.test.ts compares them. */
export const UsernameEmailDomain = '@u.wordplay.dev';

/** The synthesized address a username account signs in with. */
export function usernameEmail(username: string): string {
    return `${username}${UsernameEmailDomain}`;
}

/** The username inside a synthesized address, or undefined when the address is
 *  a real one — which is what tells a password account from an email account. */
export function usernameFromEmail(email: string): string | undefined {
    return email.endsWith(UsernameEmailDomain)
        ? email.slice(0, -UsernameEmailDomain.length)
        : undefined;
}
