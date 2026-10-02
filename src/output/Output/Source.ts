import toStructure from '#basis/toStructure.ts';
import type Locales from '#locale/Locales.ts';
import { getBind } from '#locale/getBind.ts';
import { TABLE_CLOSE_SYMBOL, TABLE_OPEN_SYMBOL } from '#parser/Symbols.ts';

export function createSourceType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Source, '•')} (
        ${getBind(locales, (locale) => locale.output.Source.name)}•""
        ${getBind(
            locales,
            (locale) => locale.output.Source.value,
        )}•?|""|#|[]|{}|{:}|${TABLE_OPEN_SYMBOL}${TABLE_CLOSE_SYMBOL}
    )`);
}
