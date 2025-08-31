import type Node from '@nodes/Node';
import type Spaces from '../../../parser/Spaces';

export function copyNode(
    node: Node,
    spaces: Spaces,
): Promise<true | undefined> {
    return toClipboard(node.toWordplay(spaces).trim());
}

export async function toClipboard(text: string): Promise<true | undefined> {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error(err, 'Failed to copy to clipboard');
            return undefined;
        }
    } else {
        console.error('Clipboard API not supported');
        return undefined;
    }
}
