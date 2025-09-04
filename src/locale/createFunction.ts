import type Bind from '@nodes/Bind';
import type Expression from '@nodes/Expression';
import FunctionDefinition from '@nodes/FunctionDefinition';
import type Type from '@nodes/Type';
import type TypeVariables from '@nodes/TypeVariables';
import { getDocLocales } from './getDocLocales';
import { getNameLocales } from './getNameLocales';
import type Locales from './Locales';
import type { LocaleText, NameAndDoc } from './LocaleText';

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
