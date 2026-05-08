import type { LocaleTextAccessor } from '@locale/Locales';
import type Node from '@nodes/Node';
import type Spaces from '@parser/Spaces';
import { setInternalClipboard } from '@components/editor/commands/InternalClipboard';

export function copyNode(
    node: Node,
    spaces: Spaces,
): Promise<true | LocaleTextAccessor> {
    return toClipboard(node.toWordplay(spaces).trim());
}

export async function toClipboard(
    text: string,
): Promise<true | LocaleTextAccessor> {
    // Populate the in-app clipboard before the OS write so paste-from-app
    // works even if the OS write fails (e.g., permission denied).
    setInternalClipboard(text);
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            return (l) => l.ui.source.cursor.ignored.noClipboard;
        }
    } else {
        return (l) => l.ui.source.cursor.ignored.noClipboard;
    }
}
