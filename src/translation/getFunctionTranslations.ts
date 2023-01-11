import { getNameTranslations } from './getNameTranslations';
import { getDocTranslations } from './getDocTranslations';
import { getInputTranslations } from './getInputTranslations';
import type { FunctionTranslation } from './Translation';
import type Translation from './Translation';

export function getFunctionTranslations(
    select: (translation: Translation) => FunctionTranslation<any>
) {
    return {
        docs: getDocTranslations((t) => select(t).doc),
        names: getNameTranslations((t) => select(t).name),
        inputs: getInputTranslations((t) => select(t).inputs),
    };
}
