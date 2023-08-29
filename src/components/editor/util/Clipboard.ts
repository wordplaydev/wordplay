import type Node from '@nodes/Node';
import type Spaces from '@parser/Spaces';

export function copyNode(
    node: Node,
    spaces?: Spaces
): Promise<undefined> | undefined {
    return toClipboard(node.toWordplay(spaces).trim());
}

export function toClipboard(text: string) {
    if (navigator.clipboard)
        return navigator.clipboard
            .write([
                new ClipboardItem({
                    'text/plain': new Blob([text], {
                        type: 'text/plain',
                    }),
                }),
            ])
            .then(() => undefined);
    else return undefined;
}
