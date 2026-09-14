import type Expression from '@nodes/Expression';
import type Type from '@nodes/Type';
import { createBind } from '@locale/createBind';
import type Locales from '@locale/Locales';
import type LocaleText from '@locale/LocaleText';
import type { NameAndDoc } from '@locale/LocaleText';
import { must } from '@util/nullable';

export function createInputs(
    locales: Locales,
    fun: (locale: LocaleText) => readonly NameAndDoc[],
    types: (Type | [Type, Expression])[],
) {
    return types.map((type, index) =>
        createBind(
            locales,
            // Each locale declares a name and doc per type; a locale missing
            // one is a malformed locale, which this reports rather than
            // silently binding nothing.
            (l) => must(fun(l)[index], `an input at index ${index}`),
            Array.isArray(type) ? type[0] : type,
            Array.isArray(type) ? type[1] : undefined,
        ),
    );
}
