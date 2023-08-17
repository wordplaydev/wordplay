export default function getScrollParent(node) {
    const isElement = node instanceof HTMLElement;
    const overflowY = isElement && window.getComputedStyle(node).overflowY;
    const isScrollable = overflowY !== 'visible' && overflowY !== 'hidden';
    if (!node) {
        return document.body;
    }
    else if (isScrollable && node.scrollHeight >= node.clientHeight) {
        return node;
    }
    return node.parentNode instanceof HTMLElement
        ? getScrollParent(node.parentNode) ?? document.body
        : document.body;
}
//# sourceMappingURL=getScrollParent.js.map