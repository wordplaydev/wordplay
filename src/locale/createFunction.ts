import type Bind from '#nodes/Bind.ts';
import type Expression from '#nodes/Expression.ts';
import FunctionDefinition from '#nodes/FunctionDefinition.ts';
import type Type from '#nodes/Type.ts';
import type TypeVariables from '#nodes/TypeVariables.ts';
import { getDocLocales } from '#locale/getDocLocales.ts';
import { getNameLocales } from '#locale/getNameLocales.ts';
import type Locales from '#locale/Locales.ts';
import type { LocaleText, NameAndDoc } from '#locale/LocaleText.ts';

export function createFunction(
    locales: Locales,
    nameAndDoc: (locale: LocaleText) => NameAndDoc,
    typeVars: TypeVariables | undefined,
    inputs: Bind[],
    output: Type,
    expression: Expression,
) {
    return FunctionDefinition.make(
        getDocLocales(locales, (l) => nameAndDoc(l).doc),
        getNameLocales(locales, (l) => nameAndDoc(l).names),
        typeVars,
        inputs,
        expression,
        output,
    );
}
