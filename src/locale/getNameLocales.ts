import Name from '@nodes/Name';
import Names from '@nodes/Names';
import type { NameText } from './Locale';
import type Locale from './Locale';
import { localeToLanguage } from './localeToLanguage';

export function getNameLocales(
    locales: Locale[],
    select: (translation: Locale) => NameText
): Names {
    return new Names(
        locales.reduce((names: Name[], locale) => {
            const name = select(locale);
            return names.concat(
                (Array.isArray(name) ? name : [name]).map((n) =>
                    Name.make(n, localeToLanguage(locale))
                )
            );
        }, [])
    );
}
