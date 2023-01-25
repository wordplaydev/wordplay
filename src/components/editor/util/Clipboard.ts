import type Node from '@nodes/Node';
import type Spaces from '../../../parser/Spaces';

export function toClipboard(
    node: Node,
    spaces?: Spaces
): Promise<undefined> | undefined {
    if (navigator.clipboard)
        return navigator.clipboard
            .write([
                new ClipboardItem({
                    'text/plain': new Blob([node.toWordplay(spaces)], {
                        type: 'text/plain',
                    }),
                }),
            ])
            .then(() => undefined);
    else return undefined;
}
