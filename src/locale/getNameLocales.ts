import Name from '@nodes/Name';
import SupportedLocales from './locales';
import Names from '@nodes/Names';
import type { NameText } from './Locale';
import type Locale from './Locale';
import { localeToLanguage } from './localeToLanguage';

export function getNameLocales(
    select: (translation: Locale) => NameText
): Names {
    return new Names(
        SupportedLocales.reduce((names: Name[], translation) => {
            const name = select(translation);
            return names.concat(
                (Array.isArray(name) ? name : [name]).map((n) =>
                    Name.make(n, localeToLanguage(translation))
                )
            );
        }, [])
    );
}
