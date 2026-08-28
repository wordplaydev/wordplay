import { Languages } from '@locale/LanguageCode';
import { getRegionName } from '@locale/tagNames';
import Language from '@nodes/Language';
import type Node from '@nodes/Node';

/**
 * What the locale tag a menu suggestion would insert actually names, e.g. `/es-MX` →
 * "español (México)".
 *
 * Every tag suggestion otherwise shares one generic note ("I'm a language tag and I work
 * with @Name and @Doc!"), which is the same sentence for all of them and so distinguishes
 * none — the same problem the unit names next door solve (#890). The menu inserts codes,
 * which is what a creator should end up with, and this is what says which language a code
 * is. The names are the ones the tag itself now accepts (#1220), so the note also teaches
 * that a name is a way to write the tag.
 *
 * Unlike unit names, these are not per-locale: a language's own name is the same string
 * for every reader, which is the point of showing it.
 */
export function getLanguageTagName(node: Node): string | undefined {
    if (!(node instanceof Language)) return undefined;
    const languages = node
        .getLanguageCodes()
        .map((code) => Languages[code]?.name ?? code);
    if (languages.length === 0) return undefined;
    // ` + ` joins a multilingual tag's languages, matching how locale names are
    // already joined elsewhere in the UI.
    const name = languages.join(' + ');
    const regions = node.getRegionCodes().map(getRegionName);
    return regions.length === 0 ? name : `${name} (${regions.join('/')})`;
}
