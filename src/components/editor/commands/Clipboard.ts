import type { LocaleTextAccessor } from '@locale/Locales';
import type Node from '@nodes/Node';
import type Spaces from '../../../parser/Spaces';

export function copyNode(
    node: Node,
    spaces: Spaces,
): Promise<true | LocaleTextAccessor> {
    return toClipboard(node.toWordplay(spaces).trim());
}

export async function toClipboard(
    text: string,
): Promise<true | LocaleTextAccessor> {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            return (l) => l.ui.source.cursor.ignored.noClipboard;
        }
    } else {
        return (l) => l.ui.source.cursor.ignored.noClipboard;
    }
}
