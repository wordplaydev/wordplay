/**
 * Whether a `@reference` can resolve to a language construct in the app.
 *
 * `ConceptLink.isValid` asks whether the name is a *key* in `locale.node`, but a link to a
 * language construct resolves to a `NodeConcept`, and those are built only from `Templates`
 * — one entry per browsable construct. A node key with no template therefore passes
 * verification and renders as the unknown-reference box. That is how `@Markup` shipped: the
 * locale has a full `node.Markup` entry in all 30 languages, and nothing in the app can
 * reach it.
 *
 * Only the node section needs this. Keys in `input`, `output`, and `basis` all become
 * concepts by way of the basis and its shares, so a name found there always resolves.
 */

import Templates from '@concepts/Templates';
import type LocaleText from '@locale/LocaleText';
import type ConceptLink from '@nodes/ConceptLink';

/** Every construct that becomes a browsable concept, computed once. */
let Templated: Set<string> | undefined;

function templated(): Set<string> {
    return (Templated ??= new Set(
        Templates.map((template) => template.getDescriptor()),
    ));
}

/** A link's concept name, without any property it addresses (`@Phrase.name` → `Phrase`). */
function baseName(link: ConceptLink): string {
    return link.getName().split(/[./]/)[0] ?? '';
}

export default function isUnresolvableConceptLink(
    link: ConceptLink,
    locale: LocaleText,
): boolean {
    const name = baseName(link);
    // A lowercase name is a glossary reference, which resolves on another path.
    if (!/^[A-Z]/.test(name)) return false;
    // Not a construct at all — a character, codepoint, or UI reference. `isBroken` owns those.
    if (!(name in locale.node)) return false;
    // Resolvable as a value type or output instead, whatever the node section says.
    if (name in locale.input || name in locale.output || name in locale.basis)
        return false;
    return !templated().has(name);
}
