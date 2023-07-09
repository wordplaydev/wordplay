import { getNameLocales } from './getNameLocales';
import { getDocLocales } from './getDocLocales';
import { getInputLocales } from './getInputLocales';
import type { FunctionText } from './Locale';
import type Locale from './Locale';

export function getFunctionLocales(
    locales: Locale[],
    select: (translation: Locale) => FunctionText<any>
) {
    return {
        docs: getDocLocales(locales, (t) => select(t).doc),
        names: getNameLocales(locales, (t) => select(t).name),
        inputs: getInputLocales(locales, (t) => select(t).inputs),
    };
}
