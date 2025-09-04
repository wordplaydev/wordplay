import toStructure from '@basis/toStructure';
import type Locales from '@locale/Locales';
import { getBind } from '@locale/getBind';
import { TABLE_CLOSE_SYMBOL, TABLE_OPEN_SYMBOL } from '@parser/Symbols';

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
