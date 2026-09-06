import type { SerializedNotice } from 'shared-types';

/**
 * Where a notice leads.
 *
 * One function over the notice's own subject, replacing the chain of `{#if}`s
 * the bell used to carry — and, with it, the `itemID.includes('-approved-')`
 * substring test that decided a gallery notice's wording by sniffing its key.
 * A notice says what it is about; the route follows from that.
 *
 * Returns a locale-less path; callers hand it to `localeGoto`, which adds the
 * reader's locale segment.
 */
export default function noticeLink(notice: SerializedNotice): string {
    const { kind, id, gallery } = notice.subject;

    switch (kind) {
        case 'project':
            return `/project/${id}`;
        case 'gallery':
            return `/gallery/${id}`;
        case 'howto':
            // A how-to is read inside its gallery's how-to space, so without a
            // gallery there is nowhere to send anyone; the galleries list is
            // the honest fallback rather than a link that 404s.
            return gallery === null
                ? '/galleries'
                : `/gallery/${gallery}/howto?id=${id}`;
        case 'chat':
            // A chat's id is its project's or how-to's id, so where it leads
            // depends on which it is about. A gallery means a how-to: a project
            // chat is reached through the project whether or not it's in one.
            return gallery === null
                ? `/project/${id}`
                : `/gallery/${gallery}/howto?id=${id}`;
        case 'character':
            // The editor, which is the only page that shows one character.
            // Its owner lands in it able to edit; anyone else — a moderator
            // reading a decision — sees it read-only.
            return `/character/${id}`;
    }
}

/**
 * Where a notice leads for someone acting on it, when that differs.
 *
 * A warning is about the rules rather than about a thing, and a request for
 * review is work rather than news — both belong somewhere other than their
 * subject.
 */
export function noticeAction(notice: SerializedNotice): string | undefined {
    switch (notice.kind) {
        case 'warning':
            return '/rights';
        case 'review-requested':
            return '/moderate';
        default:
            return undefined;
    }
}
