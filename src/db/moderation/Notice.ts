import type {
    NoticeKind,
    SerializedNotice,
    SerializedNotices,
} from 'shared-types';
import { z } from 'zod';

/** Where a creator's inbox lives. Client-readable, server-written. */
export const NoticesCollection = 'notices';

/**
 * How many notices an inbox keeps, mirrored from `MAX_NOTICES` in
 * functions/src/shared/index.ts.
 *
 * A mirror rather than an import because nothing in `src/` imports a *value*
 * from `shared-types`: its package.json points `main` at an `index.js` that
 * does not exist, and every existing import of it is a type, which is erased.
 * noticeSync.test.ts fails if the two drift.
 */
export const MaxNotices = 100;

/**
 * The notice kinds, as data.
 *
 * Mirrors the `NoticeKind` union in functions/src/shared/index.ts, which is a
 * type and so cannot be enumerated at runtime. noticeSync.test.ts fails if the
 * two disagree, the way galleryModerationSync.test.ts does for gallery states.
 */
export const NoticeKinds = [
    'review-requested',
    'reported',
    'report-received',
    'decision',
    'outcome',
    'chat-message',
    'howto-published',
    'gallery-listed',
    'gallery-denied',
    'warning',
] as const;

/** The kinds the server writes, as opposed to the ones the client derives. */
export const WrittenNoticeKinds = [
    'review-requested',
    'reported',
    'report-received',
    'decision',
    'outcome',
] as const;

const NoticeSubjectSchema = z.object({
    kind: z.enum(['project', 'gallery', 'chat', 'howto']),
    id: z.string(),
    gallery: z.string().nullable(),
    message: z.string().exactOptional(),
});

export const NoticeSchema = z.object({
    id: z.string(),
    kind: z.enum(NoticeKinds),
    subject: NoticeSubjectSchema,
    title: z.string(),
    time: z.number(),
    flags: z.array(z.string()).exactOptional(),
    note: z.string().exactOptional(),
    count: z.number().exactOptional(),
});

export const NoticesSchema = z.object({
    v: z.literal(1),
    notices: z.array(NoticeSchema),
    dismissed: z.array(z.string()),
    readAt: z.number(),
});

/** An empty inbox, for a creator who has never been sent anything. */
export function noNotices(): SerializedNotices {
    return { v: 1, notices: [], dismissed: [], readAt: 0 };
}

/**
 * Read a stored inbox defensively.
 *
 * Written by a Cloud Function, so a version skew during a deploy must not throw
 * in the notification bell — the same reason `toStrikes` exists. A notice that
 * doesn't parse is dropped rather than taking the whole inbox with it: one
 * unreadable entry should cost one entry.
 */
export function toNotices(data: unknown): SerializedNotices | undefined {
    if (typeof data !== 'object' || data === null) return undefined;
    const record: Record<string, unknown> = { ...data };
    const notices: SerializedNotice[] = [];
    if (Array.isArray(record.notices))
        for (const notice of record.notices) {
            const parsed = NoticeSchema.safeParse(notice);
            if (parsed.success) notices.push(parsed.data);
        }
    return {
        v: 1,
        notices,
        dismissed: Array.isArray(record.dismissed)
            ? record.dismissed.filter((id) => typeof id === 'string')
            : [],
        readAt: typeof record.readAt === 'number' ? record.readAt : 0,
    };
}

/** Whether the server wrote this kind, or the client derived it. */
export function isWritten(kind: NoticeKind): boolean {
    return (WrittenNoticeKinds as readonly string[]).includes(kind);
}
