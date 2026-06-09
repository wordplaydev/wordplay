import type { LocaleTextAccessor } from '@locale/Locales';
import type Node from '@nodes/Node';
import type Spaces from '@parser/Spaces';
import { setInternalClipboard } from '@components/editor/commands/InternalClipboard';

/**
 * A Chromium "web custom format" written alongside text/plain on copy, so paste can recognize Wordplay
 * code copied from another tab/window/instance and paste it verbatim instead of reinterpreting it (e.g.
 * as CSV). Safari/Firefox ignore the custom format and just receive text/plain, so copy never breaks.
 */
export const WORDPLAY_CLIPBOARD_FORMAT = 'web text/wordplay';

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

    // Prefer write() with a ClipboardItem so we can tag the content as Wordplay (text/plain still lands
    // for everything else). Fall back to writeText() if write()/ClipboardItem is unavailable or fails.
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        try {
            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/plain': new Blob([text], { type: 'text/plain' }),
                    [WORDPLAY_CLIPBOARD_FORMAT]: new Blob([text], {
                        type: 'text/plain',
                    }),
                }),
            ]);
            return true;
        } catch (err) {
            // Fall through to writeText (e.g. custom formats unsupported, or permission quirk).
        }
    }

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
