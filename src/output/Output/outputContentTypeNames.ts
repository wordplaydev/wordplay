import { getTypeName } from '#locale/getNameLocales.ts';
import type Locales from '#locale/Locales.ts';

/** The union member names of what a Stage or Group may hold, in the project's
 *  language, so their declared content types don't read in English. Kept out of
 *  Output.ts, whose subclasses would otherwise evaluate before it. */
export function getOutputContentTypeNames(locales: Locales) {
    return [
        getTypeName(locales, (l) => l.output.Phrase.names),
        getTypeName(locales, (l) => l.output.Shape.names),
        getTypeName(locales, (l) => l.output.Image.names),
        getTypeName(locales, (l) => l.output.Group.names),
        getTypeName(locales, (l) => l.output.Say.names),
        getTypeName(locales, (l) => l.output.Music.names),
    ].join('|');
}
