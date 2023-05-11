import { getNameLocales } from './getNameLocales';
import { getDocLocales } from './getDocLocales';
import { getInputLocales } from './getInputLocales';
import type { FunctionText } from './Locale';
import type Locale from './Locale';

export function getFunctionLocales(
    select: (translation: Locale) => FunctionText<any>
) {
    return {
        docs: getDocLocales((t) => select(t).doc),
        names: getNameLocales((t) => select(t).name),
        inputs: getInputLocales((t) => select(t).inputs),
    };
}
