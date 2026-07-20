import {
    resolveDescription,
    resolveSchemaRefName,
} from '@util/verify-locales/findUntaggedStrings';
import type LocalePath from '@util/verify-locales/LocalePath';

/**
 * How the tooling should treat a locale string or string array, derived from
 * the format tag ([plain]/[formatted]/[name]/[emotion]) in the field's TSDoc:
 *  - 'markup': Wordplay markup ([formatted]). An array is a list of paragraphs
 *    joined with blank lines for rendering; its length may vary per locale, but
 *    no element may contain a paragraph break outside `\…\` example code.
 *  - 'name': Wordplay names ([name]). An array is a list of aliases whose
 *    length may vary per locale.
 *  - 'plain': everything else. An array is positional (e.g. mode labels), so
 *    its length must match the en-US source.
 */
export type LocaleStringKind = 'markup' | 'name' | 'plain';

export default function classifyLocalePath(
    segments: (string | number)[],
): LocaleStringKind {
    // Key.keys entries are synonym lists (a display name plus aliases) whose
    // count may vary per locale, but their values (e.g. "Caps Lock", " ") are
    // not valid Wordplay names, so they keep the [plain] tag for the editor's
    // sake and are classified name-like here.
    if (
        segments[0] === 'input' &&
        segments[1] === 'Key' &&
        segments[2] === 'keys'
    )
        return 'name';
    const tag = resolveDescription(segments)?.match(
        /\[(plain|formatted|name|emotion)\]/,
    )?.[1];
    return tag === 'formatted' ? 'markup' : tag === 'name' ? 'name' : 'plain';
}

export function classifyPair(path: LocalePath): LocaleStringKind {
    return classifyLocalePath([...path.path, path.key]);
}

/** Whether a path is declared as `NameText` — a Wordplay identifier (or list
 *  of identifiers) fed to `Name.make` via `getNameLocales`. This is the scope
 *  for name repair (`toValidName`) and single-token validation: it covers
 *  `names`, `basis.*.name`, basis type variables (`kind`/`out`/`key`/…), and
 *  `output.Easing.*`, while excluding display labels merely tagged [name]
 *  (e.g. node and conflict names, which legitimately contain spaces) and
 *  `input.Key.keys.*` (inline string[], values like "Caps Lock"). */
export function isNameTextPath(segments: (string | number)[]): boolean {
    return resolveSchemaRefName(segments) === 'NameText';
}
