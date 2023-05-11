import type Name from '@nodes/Name';
import SupportedLocales from './locales';
import Names from '@nodes/Names';
import Docs from '@nodes/Docs';
import { translationToLanguage } from './translationToLanguage';
import type { NameAndDoc } from './Locale';
import type Locale from './Locale';
import { getInputNames } from './getInputLocales';
import { parseLocaleDoc } from '@parser/Parser';

export function getBind(
    select: (translation: Locale) => NameAndDoc,
    separator: string = ' '
): string {
    const inputs = SupportedLocales.map(
        (translation) => [translation, select(translation)] as const
    );
    return (
        new Docs(
            inputs.map(([translation, input]) =>
                parseLocaleDoc(input.doc).withLanguage(
                    translationToLanguage(translation)
                )
            )
        ).toWordplay() +
        separator +
        new Names(
            inputs.reduce(
                (names: Name[], [translation, input]) =>
                    names.concat(getInputNames(input, translation)),
                []
            )
        ).toWordplay()
    );
}
