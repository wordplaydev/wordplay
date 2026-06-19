import { docToMarkup } from '@locale/LocaleText';
import { firstSentenceOf } from '@locale/firstSentence';
import type Locales from '@locale/Locales';
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import type Context from '@nodes/Context';
import Evaluate from '@nodes/Evaluate';
import type Markup from '@nodes/Markup';
import type Node from '@nodes/Node';
import UnaryEvaluate from '@nodes/UnaryEvaluate';

/**
 * The one-line "what does this do" note shown under an autocomplete menu suggestion.
 *
 * Function, operator, and stream completions are previewed as an Evaluate/BinaryEvaluate/
 * UnaryEvaluate wrapper (e.g. `value.add(_)`, `a + b`, `Time()`). Those wrappers all share the
 * same generic node doc, so we instead describe the *definition being called* using its authored
 * docs. Anything else falls back to the node's own doc.
 */
export default function getMenuNoteMarkup(
    node: Node,
    context: Context,
    locales: Locales,
): Markup {
    const called =
        node instanceof Evaluate ||
        node instanceof BinaryEvaluate ||
        node instanceof UnaryEvaluate
            ? node.getFunction(context)
            : undefined;
    const docs = called?.docs.getMarkup(locales)[0];
    if (docs) return firstSentenceOf(docs, locales.getLocaleString());

    const doc = docToMarkup(node.getDoc(locales));
    return firstSentenceOf(
        doc.concretize(locales, {}) ?? doc,
        locales.getLocaleString(),
    );
}
