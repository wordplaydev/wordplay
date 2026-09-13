import type { SerializedNotice } from 'shared-types';

/**
 * Where a notice leads.
 *
 * Keep in sync with src/db/moderation/noticeLink.ts — the functions↔src wall
 * prevents a single shared module, the way it does for `reportId.ts`.
 * `noticeLink.test.ts` runs both copies against one table.
 *
 * Returns a locale-less path; the app's callers hand it to `localeGoto`, and
 * an email prefixes the reader's locale itself.
 */
export function noticeLink(notice: SerializedNotice): string {
    const { kind, id, gallery } = notice.subject;

    switch (kind) {
        case 'project':
            return `/project/${id}`;
        case 'gallery':
            return `/gallery/${id}`;
        case 'howto':
            return gallery === null
                ? '/galleries'
                : `/gallery/${gallery}/howto?id=${id}`;
        case 'chat':
            return gallery === null
                ? `/project/${id}`
                : `/gallery/${gallery}/howto?id=${id}`;
        case 'character':
            return `/character/${id}`;
        case 'kit':
            return `/guide?kit=${encodeURIComponent(id)}`;
    }
}

/** Where a notice leads for someone acting on it, when that differs. */
export function noticeAction(notice: SerializedNotice): string | undefined {
    switch (notice.kind) {
        case 'warning':
            return '/rights';
        case 'review-requested':
        case 'review-pending':
            return '/moderate';
        default:
            return undefined;
    }
}

/** The one destination an email should use: the place to act, when there is
 *  one, and otherwise the thing itself. */
export function noticeDestination(notice: SerializedNotice): string {
    return noticeAction(notice) ?? noticeLink(notice);
}
