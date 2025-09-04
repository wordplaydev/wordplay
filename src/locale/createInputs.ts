import type Expression from '@nodes/Expression';
import type Type from '@nodes/Type';
import { createBind } from './createBind';
import type Locales from './Locales';
import type LocaleText from './LocaleText';
import type { NameAndDoc } from './LocaleText';

export function createInputs(
    locales: Locales,
    fun: (locale: LocaleText) => readonly NameAndDoc[],
    types: (Type | [Type, Expression])[],
) {
    return types.map((type, index) =>
        createBind(
            locales,
            (l) => fun(l)[index],
            Array.isArray(type) ? type[0] : type,
            Array.isArray(type) ? type[1] : undefined,
        ),
    );
}
