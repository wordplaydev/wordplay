import { Modes, type GuidePlace } from '@components/concepts/GuideHistory';
import {
    getLanguageQuoteClose,
    getLanguageQuoteOpen,
} from '@locale/LanguageCode';
import type Locales from '@locale/Locales';
import { SEARCH_SYMBOL } from '@parser/Symbols';

/**
 * A short, human-readable label for one guide location, shared by the
 * Documentation panel breadcrumb and the standalone guide's unified breadcrumb.
 */
export default function placeLabel(
    place: GuidePlace,
    locales: Locales,
): string {
    if (place.kind === 'concept') return place.concept.getName(locales, false);
    if (place.kind === 'search') {
        const language = locales.getLocale().language;
        return `${SEARCH_SYMBOL} ${getLanguageQuoteOpen(language)}${place.query}${getLanguageQuoteClose(language)}`;
    }
    // Only the code section has a subsection to name; every other one names itself.
    // Indexed rather than branched on, so a section added later can't fall through to a
    // purpose header — which is exactly what `kits` did when it was added.
    if (place.mode !== 'language') {
        const which = Modes.indexOf(place.mode);
        return locales.getPlainText((l) => l.ui.docs.mode.browse.labels[which]);
    }
    return locales.getPlainText(
        (l) => l.ui.docs.purposes[place.purpose].header,
    );
}
