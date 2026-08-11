import NodeRef from '@locale/NodeRef';
import ValueRef from '@locale/ValueRef';
import Example from '@nodes/Example';
import type { Segment } from '@nodes/Paragraph';

/**
 * Loads the markup segments that render code. Kept apart from
 * SegmentHTMLView so the language runtime they need arrives only on the pages
 * that actually show an example, a node reference, or a value.
 *
 * The promise is memoized at module scope but never awaited there: a
 * module-level await anywhere in the app graph reorders WebKit's module
 * evaluation across the route/db import cycle and crashes hydration (see
 * src/util/getTemporal.ts).
 */
let loading:
    Promise<typeof import('./RichSegmentHTMLView.svelte').default> | undefined =
    undefined;

export function loadRichSegment() {
    return (loading ??= import('./RichSegmentHTMLView.svelte').then(
        (module) => module.default,
    ));
}

/** Whether this segment is one RichSegmentHTMLView renders. */
export function isRichSegment(segment: Segment): boolean {
    return (
        segment instanceof Example ||
        segment instanceof NodeRef ||
        segment instanceof ValueRef
    );
}
