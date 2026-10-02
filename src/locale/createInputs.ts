import type Expression from '#nodes/Expression.ts';
import type Type from '#nodes/Type.ts';
import { createBind } from '#locale/createBind.ts';
import type Locales from '#locale/Locales.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { NameAndDoc } from '#locale/LocaleText.ts';
import { must } from '#util/nullable.ts';

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
