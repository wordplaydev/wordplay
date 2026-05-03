import Bind from '@nodes/Bind';
import type Expression from '@nodes/Expression';
import type Type from '@nodes/Type';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import type Locales from '@locale/Locales';
import type { LocaleText, NameAndDoc } from '@locale/LocaleText';

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
