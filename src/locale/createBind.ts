import Bind from '@nodes/Bind';
import type Expression from '@nodes/Expression';
import type Type from '@nodes/Type';
import { getDocLocales } from './getDocLocales';
import { getNameLocales } from './getNameLocales';
import type Locales from './Locales';
import type { LocaleText, NameAndDoc } from './LocaleText';

export function createBind(
    locales: Locales,
    nameAndDoc: (locale: LocaleText) => NameAndDoc,
    type?: Type,
    value?: Expression,
) {
    return Bind.make(
        getDocLocales(locales, (l) => nameAndDoc(l).doc),
        getNameLocales(locales, (l) => nameAndDoc(l).names),
        type,
        value,
    );
}
