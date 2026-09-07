import type Caret from '@edit/caret/Caret';
import Example from '@nodes/Example';
import type Markup from '@nodes/Markup';
import type Node from '@nodes/Node';
import type Token from '@nodes/Token';
import WebLink from '@nodes/WebLink';
import Words from '@nodes/Words';

/**
 * Which delimiter tokens prose mode hides.
 *
 * The mechanism is RootView's existing hidden-node set — the one that already
 * hides non-preferred locale tags, which `TokenView` collapses to zero size and
 * marks `aria-hidden`. So a hidden delimiter is still in the DOM at the right
 * place and the caret can still land on it; it simply takes no room. Caret
 * navigation through hidden tokens is therefore a solved, shipped problem rather
 * than something this feature has to invent.
 *
 * **Reveal on caret, not hide always.** The delimiters of the run the caret is
 * inside stay visible, for three reasons. It is what makes the syntax
 * discoverable in place, which is the goal of #1307 — you can learn the markup
 * without leaving the prose. It is the pattern `WebLinkView` already ships,
 * switching between raw tokens and a rendered link on `caret.isIn(node, true)`.
 * And with a delimiter permanently zero-width, the two caret positions on either
 * side of it collapse onto one pixel, which makes arrow-key motion unexplainable.
 */
export default function markupHiddenTokens(
    markup: Markup,
    caret: Caret | undefined,
    prose: boolean,
): Token[] {
    if (!prose) return [];

    const hidden: Token[] = [];
    const inside = (node: Node) =>
        caret !== undefined && caret.isIn(node, true);

    for (const node of markup.nodes()) {
        if (node instanceof Words) {
            // A run with no delimiters is plain prose and has nothing to hide.
            if (node.open === undefined && node.close === undefined) continue;
            if (inside(node)) continue;
            if (node.open !== undefined) hidden.push(node.open);
            if (node.close !== undefined) hidden.push(node.close);
        } else if (node instanceof Example) {
            // The `\` pair only; the ⭐ and 🪲 suffixes say something about the
            // example that no rendering of the code conveys, so they stay.
            if (inside(node)) continue;
            hidden.push(node.open);
            if (node.close !== undefined) hidden.push(node.close);
        } else if (node instanceof WebLink) {
            // The description is the link's prose and always shows; everything
            // that makes it a link hides until the caret is inside it.
            //
            // Hiding rather than swapping in an anchor, which is what this used
            // to do: an anchor stops the pointerdown that would place the caret
            // (or the click navigates away mid-edit), so a link was a hole in
            // the text no caret could enter and no one could edit — and it added
            // a Tab stop inside `role="application"`, the hazard
            // `ConceptLinkView` documents avoiding. Hidden tokens keep their
            // place in the DOM at zero size, so the caret moves through the link
            // exactly as it moves through a bold run's `*`.
            if (inside(node)) continue;
            hidden.push(node.open);
            if (node.at !== undefined) hidden.push(node.at);
            if (node.url !== undefined) hidden.push(node.url);
            if (node.close !== undefined) hidden.push(node.close);
        }
    }
    return hidden;
}
