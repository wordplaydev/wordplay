import toStructure from '@basis/toStructure';
import { getBind } from '@locale/getBind';
import { getNameLocales } from '@locale/getNameLocales';
import type Locales from '@locale/Locales';
import type Names from '@nodes/Names';

/**
 * The localized name(s) of the `Result` structure, drawn from the active
 * locales — the same source {@link createResultType} uses for the definition's
 * names, so they always agree. The Text basis uses the first to name `⌕`'s
 * `[Result]` return type by reference: the structure is registered after the
 * Text basis bootstraps, so it can't be looked up directly there (the pattern
 * Color.ts uses for its own type).
 */
export function getResultTypeNames(locales: Locales): Names {
    return getNameLocales(locales, (locale) => locale.output.Result.names);
}

/**
 * The `Result` structure, one element of a `⌕` search list (LANGUAGE.md): the
 * matched text, its 1-based inclusive grapheme positions, and the named captures
 * (text and positions). Localized like the other output structures.
 */
export function createResultType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Result, '•')}(
        ${getBind(locales, (locale) => locale.output.Result.text)}•''
        ${getBind(locales, (locale) => locale.output.Result.start)}•#
        ${getBind(locales, (locale) => locale.output.Result.end)}•#
        ${getBind(locales, (locale) => locale.output.Result.groups)}•{'' : ''}
        ${getBind(locales, (locale) => locale.output.Result.starts)}•{'' : #}
        ${getBind(locales, (locale) => locale.output.Result.ends)}•{'' : #}
    )
`);
}
