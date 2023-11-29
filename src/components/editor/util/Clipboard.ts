import type Node from '@nodes/Node';
import type Spaces from '../../../parser/Spaces';

export function copyNode(
    node: Node,
    spaces: Spaces
): Promise<undefined> | undefined {
    return toClipboard(node.toWordplay(spaces).trim());
}

export function toClipboard(text: string) {
    if (navigator.clipboard && navigator.clipboard.writeText)
        return navigator.clipboard.writeText(text).then(() => undefined);
    else return undefined;
}
