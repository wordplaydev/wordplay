import { docToMarkup } from '@locale/LocaleText';
import { firstSentenceOf } from '@locale/firstSentence';
import type Locales from '@locale/Locales';
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import type Context from '@nodes/Context';
import type Definition from '@nodes/Definition';
import Evaluate from '@nodes/Evaluate';
import Markup from '@nodes/Markup';
import type Node from '@nodes/Node';
import PropertyReference from '@nodes/PropertyReference';
import Reference from '@nodes/Reference';
import UnaryEvaluate from '@nodes/UnaryEvaluate';
import { getUnitKey, getUnitName } from './unitName';

/**
 * The one-line "what does this do" note shown under an autocomplete menu suggestion.
 *
 * Function, operator, and stream completions are previewed as an Evaluate/BinaryEvaluate/
 * UnaryEvaluate wrapper (e.g. `value.add(_)`, `a + b`, `Time()`), and bind completions as a
 * Reference or PropertyReference (e.g. `major`, `Music.major`). Every node of a given kind
 * shares one generic node doc, so a list of them would read identically; we instead describe
 * the *definition being named* using its authored docs. Anything else falls back to the
 * node's own doc.
 *
 * `definition` is for callers that already know what a node names. A menu preview node is
 * detached from the source tree, so a bare Reference can't resolve its own name through
 * scope — the revision that created it is the only handle.
 */
export default function getMenuNoteMarkup(
    node: Node,
    context: Context,
    locales: Locales,
    definition?: Definition,
): Markup {
    // A unit's own doc is the generic "I am a unit of measurement!", identical for all 252
    // unit suggestions, so name the unit instead when we know its name (#890). Callers that
    // can echo per locale use `getUnitNameMarkup` directly; this is the primary locale.
    const unit = getUnitKey(node);
    const unitName =
        unit === undefined ? undefined : getUnitName(unit, locales);
    if (unitName !== undefined) return Markup.words(unitName);

    const named =
        definition ??
        (node instanceof Evaluate ||
        node instanceof BinaryEvaluate ||
        node instanceof UnaryEvaluate
            ? node.getFunction(context)
            : node instanceof Reference || node instanceof PropertyReference
              ? node.resolve(context)
              : undefined);
    // TypeVariable and Source are Definitions without docs.
    const docs =
        named && 'docs' in named ? named.docs.getMarkup(locales)[0] : undefined;
    if (docs) return firstSentenceOf(docs, locales.getLocaleString());

    const doc = docToMarkup(node.getDoc(locales));
    return firstSentenceOf(
        doc.concretize(locales, {}) ?? doc,
        locales.getLocaleString(),
    );
}
