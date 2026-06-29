import type LocaleText from '@locale/LocaleText';
import LocaleSchema from '@util/verify-locales/LocaleSchema';
import { getKeyTemplatePairs } from '@util/verify-locales/LocalePath';

/**
 * Find user-visible string fields whose locale type declaration is missing a
 * format tag ([plain]/[formatted]/[name]/[emotion]). Such fields are editable in
 * context (e.g. MarkupHTMLView) but invisible to the in-app localization editor
 * and to `npm run locales-translate`, so translators never see them — a silent
 * coverage gap. We enumerate the actual translatable leaves with the same walker
 * the editor uses (`getKeyTemplatePairs`) and check each one's schema
 * description (derived from the TSDoc comment) for a recognized tag.
 */

/** Top-level metadata paths that are strings/arrays-of-strings but NOT
 *  user-visible translatable text, so they legitimately carry no format tag. */
const EXCLUDED_PREFIXES: readonly string[] = ['$schema', 'language', 'regions'];

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Resolve a local `#/a/b` JSON-schema ref against the loaded schema. Ref
 *  segments are percent-encoded (generic type names like `FunctionText<[…]>`
 *  become `FunctionText%3C%5B…%5D%3E`), so each segment is decoded. */
function resolveRef(ref: string): unknown {
    let node: unknown = LocaleSchema;
    for (const part of ref.replace(/^#\//, '').split('/')) {
        if (!isRecord(node)) return undefined;
        node = node[decodeURIComponent(part)];
    }
    return node;
}

/** Resolve a single `$ref` level (returns the node unchanged if it isn't one). */
function deref(node: unknown): unknown {
    if (isRecord(node) && typeof node['$ref'] === 'string')
        return resolveRef(node['$ref']);
    return node;
}

/** The node's own (or $ref target's) TSDoc description, if any. */
function ownDescription(node: unknown): string | undefined {
    for (const candidate of [node, deref(node)]) {
        const description = isRecord(candidate)
            ? candidate['description']
            : undefined;
        if (typeof description === 'string') return description;
    }
    return undefined;
}

/** Whether a TSDoc description carries one of the recognized format tags. */
function hasFormatTag(description: string | undefined): boolean {
    return (
        description !== undefined &&
        /\[(?:plain|formatted|name|emotion)\]/.test(description)
    );
}

/** Descend from a schema node by one path segment, searching `properties`,
 *  intersection/union branches (`allOf`/`anyOf`/`oneOf`, from `A & B` / `A | B`
 *  types), tuple/array `items`, and `additionalProperties` (Record types). */
function childAt(node: unknown, segment: string | number): unknown {
    const n = deref(node);
    if (!isRecord(n)) return undefined;

    if (typeof segment === 'number') {
        const items = n['items'];
        if (Array.isArray(items)) return items[segment];
        if (isRecord(items)) return items;
    } else {
        const props = n['properties'];
        if (isRecord(props) && props[segment] !== undefined)
            return props[segment];
    }

    for (const combinator of ['allOf', 'anyOf', 'oneOf']) {
        const branches = n[combinator];
        if (Array.isArray(branches))
            for (const branch of branches) {
                const child = childAt(branch, segment);
                if (child !== undefined) return child;
            }
    }

    if (typeof segment === 'string') {
        const additional = n['additionalProperties'];
        if (isRecord(additional)) return additional;
    }
    return undefined;
}

/** Walk the schema along the leaf's segments and return its effective TSDoc
 *  description, or undefined. Mirrors the editor's resolver
 *  ([localize/+page.svelte](src/routes/[[locale]]/localize/+page.svelte) `getDescription`):
 *  a tag may sit on the leaf itself OR be inherited from the nearest tagged
 *  ancestor (e.g. a `label:` object's `[plain]` applies to its string children),
 *  so the check agrees with what's actually editable. */
export function resolveDescription(
    segments: (string | number)[],
): string | undefined {
    let node: unknown = resolveRef('#/definitions/LocaleText');
    let inherited: string | undefined;
    for (const segment of segments) {
        if (node === undefined) return undefined;
        const here = ownDescription(node);
        if (hasFormatTag(here)) inherited = here;
        node = childAt(node, segment);
    }
    if (node === undefined) return inherited;
    return ownDescription(node) ?? inherited;
}

/** Return the dotted paths of translatable string leaves missing a format tag. */
export default function findUntaggedStrings(locale: LocaleText): string[] {
    const untagged: string[] = [];
    for (const pair of getKeyTemplatePairs(locale)) {
        // An empty array carries no translatable text (e.g. a function with no
        // inputs, `inputs: []`); skip it rather than demand a tag.
        if (Array.isArray(pair.value) && pair.value.length === 0) continue;
        const segments = [...pair.path, pair.key];
        const dotted = segments.join('.');
        if (EXCLUDED_PREFIXES.some((p) => dotted === p || dotted.startsWith(p)))
            continue;
        if (!hasFormatTag(resolveDescription(segments))) untagged.push(dotted);
    }
    return untagged;
}
