/**
 * WCAG 2.5.3, Label in Name: a control's accessible name must contain the words
 * it shows, so that someone who speaks what they see can activate it. Our
 * controls are named by their tip, which says what they do and often shares no
 * words with what they show (🌎 English is "choose language(s) for the
 * website"), so the shown words lead the name whenever the tip lacks them.
 */

/** Symbols and emoji are not words a person would speak to name a control, and
 *  axe ignores them too; variation selectors are marks and must go explicitly. */
const Unspoken = /[^\p{L}\p{M}\p{N}\p{P}\s]|[︀-️]/gu;
const Spoken = /[\p{L}\p{N}]/u;
const NonWord = /[^\p{L}\p{M}\p{N}]+/gu;

/** Subtrees whose text isn't part of what a control shows as its label: hidden
 *  content, and the dimmed echo of secondary locales, which aria text omits. */
const Unshown = '[aria-hidden="true"], .secondary';

/** The words an element shows, without symbols or emoji, or '' if it shows none. */
export function getShownWords(element: Element): string {
    let text = '';
    const walker = element.ownerDocument.createTreeWalker(
        element,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
        {
            acceptNode: (node) =>
                node instanceof Element && node.matches(Unshown)
                    ? NodeFilter.FILTER_REJECT
                    : NodeFilter.FILTER_ACCEPT,
        },
    );
    for (let node = walker.nextNode(); node; node = walker.nextNode())
        if (node instanceof Text) text += node.data;
    const words = text.replace(Unspoken, ' ').replace(/\s+/g, ' ').trim();
    return Spoken.test(words) ? words : '';
}

function normalized(text: string) {
    return ` ${text.toLowerCase().replace(NonWord, ' ').trim()} `;
}

/** The tip, led by the shown words when the tip doesn't already contain them. */
export function getNameWithShownWords(shown: string, tip: string): string {
    if (shown.length === 0 || normalized(tip).includes(normalized(shown)))
        return tip;
    return tip.length === 0 ? shown : `${shown}, ${tip}`;
}

/** Report an element's shown words now and whenever its content changes. An
 *  attachment, so a control's name follows content it renders but doesn't own. */
export function observeShownWords(
    element: Element,
    report: (words: string) => void,
): () => void {
    const measure = () => report(getShownWords(element));
    measure();
    const observer = new MutationObserver(measure);
    observer.observe(element, {
        childList: true,
        characterData: true,
        subtree: true,
    });
    return () => observer.disconnect();
}
