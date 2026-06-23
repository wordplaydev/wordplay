import type { LocaleTextAccessor } from '@locale/Locales';
import type Markup from '@nodes/Markup';

/**
 * A transient message shown in an editor's footer notification band. Multiple notifications can be
 * active at once and stack vertically. Known producers include large-deletion warnings and
 * block-drag feedback; the channel is generic so other editor features can add their own.
 */
export type EditorNotification = {
    /** Stable id within an editor. set() upserts by id; clear() removes by id. */
    id: string;
    /** Either a localized text path, or prebuilt Markup (e.g. a conflict explanation) optionally preceded
     *  by a localized plain-text prefix (e.g. "Can't drop there:") to frame what the markup is saying. */
    content:
        | { path: LocaleTextAccessor }
        | { markup: Markup; prefix?: LocaleTextAccessor };
    /** Visual variant. Defaults to 'info'. */
    variant?: 'info' | 'warning' | 'error';
};

/** Known notification ids. */
export const LargeDeletionNotification = 'large-deletion';
export const DragFeedbackNotification = 'drag-feedback';
export const PasteFeedbackNotification = 'paste-feedback';
export const TabNotification = 'tab';

/** A controller an editor uses to add and remove its footer notifications. */
export type EditorNotifier = {
    /** Add a notification, replacing any existing one with the same id. */
    set: (notification: EditorNotification) => void;
    /** Remove the notification with the given id, if present. */
    clear: (id: string) => void;
    /** Remove all of this editor's notifications. */
    clearAll: () => void;
};
