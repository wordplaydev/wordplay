import UnicodeString from '../../../unicode/UnicodeString';

export function measureTokenSegment(tokenView: Element, tokenOffset: number) {
    // Find the first text node of the token view.
    const textNode = Array.from(tokenView.childNodes).find(
        (node) => node.nodeType === node.TEXT_NODE,
    );
    // Use a range to measure its dimensions.
    if (textNode) {
        // The text can contain emojis. We must segment it by graphemes to determine the
        // codepoint offset from which to measure the width.
        const codepointOffset = new UnicodeString(textNode.textContent ?? '')
            .substring(0, tokenOffset)
            .toString().length;
        return measureSubstringWidth(textNode, 0, codepointOffset);
    } else return undefined;
}

/** Given a text node, determine the dimensions of a substring of it. */
function measureSubstringWidth(node: ChildNode, start: number, end: number) {
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end);

    const rect = range.getBoundingClientRect();
    return [rect.width, rect.height];
}
