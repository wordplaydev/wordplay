import { getNameLocales } from './getNameLocales';
import { getDocLocales } from './getDocLocales';
import { getInputLocales } from './getInputLocales';
import type { FunctionText } from './Locale';
import type Locale from './Locale';

export function getFunctionLocales(
    locales: Locale[],
    select: FunctionText<any> | ((translation: Locale) => FunctionText<any>)
) {
    const text = select instanceof Function ? select(locales[0]) : select;
    return {
        docs: getDocLocales(locales, (t) => text.doc),
        names: getNameLocales(locales, (t) => text.names),
        inputs: getInputLocales(locales, (t) => text.inputs),
    };
}
