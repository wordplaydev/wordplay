/**
 * Small, total helpers for the places where TypeScript cannot see that a
 * value is present. With `noUncheckedIndexedAccess` on, an index read is
 * `T | undefined`; these give a name to the honest question rather than an
 * assertion (`!` or `as`) that silences it. Prefer `for…of`/`entries()` over
 * index loops, and these over `??` where no default is genuinely right.
 */

/** The first element, or undefined when the list is empty. */
export function first<T>(xs: readonly T[]): T | undefined {
    return xs[0];
}

/** The last element, or undefined when the list is empty. */
export function last<T>(xs: readonly T[]): T | undefined {
    return xs.at(-1);
}

/** A predicate for `.filter(isDefined)`, narrowing away null and undefined. */
export function isDefined<T>(x: T | undefined | null): x is T {
    return x !== undefined && x !== null;
}

/** A list known to hold at least one element, so `[0]` is `T`. Mutable, so
 *  it is assignable wherever a `T[]` is expected. */
export type NonEmpty<T> = [T, ...T[]];

/** The readonly counterpart of `NonEmpty`. */
export type ReadonlyNonEmpty<T> = readonly [T, ...T[]];

/** Whether a list has at least one element, narrowing it to `NonEmpty`. */
export function isNonEmpty<T>(xs: T[]): xs is NonEmpty<T>;
export function isNonEmpty<T>(xs: readonly T[]): xs is ReadonlyNonEmpty<T>;
export function isNonEmpty<T>(xs: readonly T[]): boolean {
    return xs.length > 0;
}

/** Whether every element is present, narrowing the whole list at once. */
export function allDefined<T>(xs: (T | undefined | null)[]): xs is T[];
export function allDefined<T>(
    xs: readonly (T | undefined | null)[],
): xs is readonly T[];
export function allDefined<T>(xs: readonly (T | undefined | null)[]): boolean {
    return xs.every(isDefined);
}

/** Membership in a readonly list of string literals, narrowing the string.
 *  `ReadonlyArray<T>.includes` insists on a `T` argument, which is the
 *  question being asked; this asks it without a cast. */
export function includesString<T extends string>(
    xs: readonly T[],
    s: string,
): s is T {
    return xs.some((x) => x === s);
}

/**
 * The own keys of a record whose static type lists them. `Object.keys` widens
 * to `string[]`; this keeps the literal key type. Only sound when the argument
 * is the record's own literal type (structural widening can hide extra keys),
 * so prefer an explicit `readonly` key list where one is at hand.
 */
export function keysOf<K extends string>(
    record: Readonly<Partial<Record<K, unknown>>>,
): K[] {
    return Object.keys(record).filter((key): key is K =>
        Object.hasOwn(record, key),
    );
}

/** `Object.entries` keeping the literal key type; same caveat as `keysOf`. */
export function entriesOf<K extends string, V>(
    record: Readonly<Record<K, V>>,
): [K, V][];
export function entriesOf<K extends string, V>(
    record: Readonly<Partial<Record<K, V>>>,
): [K, V | undefined][];
export function entriesOf<K extends string, V>(
    record: Readonly<Partial<Record<K, V>>>,
): [K, V | undefined][] {
    return keysOf(record).map((key) => [key, record[key]]);
}

/**
 * A regular expression match as a tuple whose whole-match slot is present.
 * `RegExpMatchArray` is typed as `string[]`, so under
 * `noUncheckedIndexedAccess` even `match[0]` reads as possibly undefined,
 * though a match always carries it; unmatched optional groups are undefined.
 */
export function matchGroups(
    match: RegExpMatchArray,
): [whole: string, ...groups: (string | undefined)[]] {
    const [whole, ...groups] = match;
    if (whole === undefined)
        throw new Error('A regular expression match had no whole match');
    return [whole, ...groups];
}

/**
 * A value that an invariant outside the type system guarantees is present: a
 * parsed constant, a test fixture, a table the code itself declared. Throws
 * with the name of what was expected. Not for silencing the compiler about a
 * value that can genuinely be absent — handle that where it happens.
 */
export function must<T>(x: T | undefined | null, what: string): T {
    if (x === undefined || x === null) throw new Error(`Expected ${what}`);
    return x;
}
