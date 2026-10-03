import type Project from '#db/projects/Project.ts';
import type Locales from '#locale/Locales.ts';
import changedSpan, { type ChangedSpan } from './changedSpan.ts';

/** How much of a changed span is read back: enough to recognize it, not all of it. */
export const SpanPreviewLength = 40;

/** A span of code as a screen reader should hear it: line breaks and runs of
 *  space collapsed, and a long one cut short, since the point is to confirm
 *  what changed rather than to read it all. */
export function previewSpan(text: string): string {
    const collapsed = text.replace(/\s+/g, ' ').trim();
    return collapsed.length > SpanPreviewLength
        ? `${collapsed.slice(0, SpanPreviewLength)}…`
        : collapsed;
}

/** The first source whose code differs between the two versions: which one,
 *  and the span that changed. Sources are paired by position: an undo that
 *  adds or removes a source is described by the first source that changed, or
 *  by nothing if none did. */
export function changedSourceSpan(
    from: Project,
    to: Project,
): (ChangedSpan & { source: number }) | undefined {
    const before = from.getSources();
    const after = to.getSources();
    for (
        let index = 0;
        index < Math.min(before.length, after.length);
        index++
    ) {
        const earlier = before[index];
        const later = after[index];
        if (earlier === undefined || later === undefined) continue;
        const span = changedSpan(earlier.getCode(), later.getCode());
        if (span !== undefined) return { ...span, source: index };
    }
    return undefined;
}

/** The restored versions an editor has already described with its caret, so
 *  the project view's fallback (for a source no editor is showing) stays
 *  quiet. Held weakly: a version is described at most once and then forgotten
 *  with the project. */
export const spokenRestores = new WeakSet<Project>();

/**
 * What an undo or redo did, for a screen reader: the code that came back and
 * the code that went away. Two undos of the same edit give the same sentence
 * (undoing `111` is "1 is gone" each time), which is why the announcement
 * kinds that carry this allow a repeat (see `edit` and `restore` in
 * announcerQueue.ts) rather than this inventing something to vary.
 */
export default function describeRestore(
    from: Project,
    to: Project,
    direction: -1 | 1,
    locales: Locales,
): string {
    const span = changedSourceSpan(from, to);
    const inputs = {
        added:
            span !== undefined && span.added.trim().length > 0
                ? previewSpan(span.added)
                : undefined,
        removed:
            span !== undefined && span.removed.trim().length > 0
                ? previewSpan(span.removed)
                : undefined,
    };
    return (
        direction < 0
            ? locales.concretize((l) => l.ui.edit.undone, inputs)
            : locales.concretize((l) => l.ui.edit.redone, inputs)
    ).toText();
}
