import Node from '@nodes/Node';
import type { Path } from '@nodes/Root';
import type Source from '@nodes/Source';
import * as Y from 'yjs';
import { base64ToBytes, bytesToBase64 } from './ProjectCRDT';

/**
 * # Why we don't publish raw character offsets
 *
 * A naive presence payload would publish `caret: 42` — but as soon as
 * a peer inserts text in front of that position, "42" no longer refers
 * to the same character. The peer's caret on our screen drifts and
 * everyone's caret-tracking falls apart under concurrent editing.
 *
 * Yjs gives us {@link Y.RelativePosition} for exactly this: a small
 * opaque reference anchored to the Y.Text *content* between two
 * characters, not the integer index between them. When we later
 * resolve a RelativePosition against the local Y.Doc with
 * {@link Y.createAbsolutePositionFromRelativePosition}, Yjs walks the
 * CRDT structure and tells us where that anchor lives *now*, after
 * every concurrent insert and delete. The character index shifts
 * around the anchor automatically.
 *
 * # Why nodes use Path instead
 *
 * Block-mode carets select an AST node, not a text offset. The Path
 * (a list of `{ type, index }` hops from the source root) survives a
 * re-parse as long as the same node tree is still there. When it
 * isn't — e.g. a peer deleted the function our caret was inside —
 * we walk up the path one hop at a time until we find an existing
 * ancestor. That's the "nearest" fallback the spec calls for. The
 * caret renders on that ancestor instead of vanishing.
 *
 * # The published payload
 *
 * Three tagged variants so consumers can branch on shape without
 * having to inspect runtime types of the underlying value:
 *
 *   - **point** — a single text-mode position (the common case)
 *   - **range** — a selection between two text-mode positions
 *   - **node**  — a block-mode node selection
 *
 * The encoded byte strings are base64 so they survive Firestore
 * transport (Firestore doesn't accept raw Uint8Array in document
 * fields).
 */
export type RemoteCaret =
    | { kind: 'point'; pos: string }
    | { kind: 'range'; anchor: string; head: string }
    | { kind: 'node'; path: Path }
    | null;

/**
 * Encode the local user's caret position into a form that's safe to
 * publish through Firestore and re-resolve on a peer's machine.
 *
 *   - `Node` becomes `{ kind: 'node', path }` — Path is already
 *     serializable plain data; we resolve it on the receiver side.
 *   - `number` becomes `{ kind: 'point', pos: <base64> }` — a Yjs
 *     RelativePosition pointing at the same content character.
 *   - `[number, number]` becomes `{ kind: 'range', anchor, head }` —
 *     two RelativePositions for the selection endpoints.
 *
 * Returns `null` for any position we can't encode (e.g., a Node not
 * in the current root, or any input we don't recognize). Receivers
 * treat null as "this peer's caret is hidden right now."
 */
export function encodeRemoteCaret(
    yText: Y.Text,
    source: Source,
    position: number | Node | [number, number] | null,
): RemoteCaret {
    if (position === null) return null;

    if (position instanceof Node) {
        const path = source.root.getPath(position);
        return path === undefined ? null : { kind: 'node', path };
    }

    if (typeof position === 'number') {
        const rp = Y.createRelativePositionFromTypeIndex(yText, position);
        return {
            kind: 'point',
            pos: bytesToBase64(Y.encodeRelativePosition(rp)),
        };
    }

    // `[number, number]` selection range.
    if (
        Array.isArray(position) &&
        position.length === 2 &&
        typeof position[0] === 'number' &&
        typeof position[1] === 'number'
    ) {
        const aRp = Y.createRelativePositionFromTypeIndex(yText, position[0]);
        const hRp = Y.createRelativePositionFromTypeIndex(yText, position[1]);
        return {
            kind: 'range',
            anchor: bytesToBase64(Y.encodeRelativePosition(aRp)),
            head: bytesToBase64(Y.encodeRelativePosition(hRp)),
        };
    }

    return null;
}

/**
 * Decode a {@link RemoteCaret} payload against the local Y.Text + Source
 * so a peer's caret renders at the right place *right now*, even though
 * the document has shifted around since they last published.
 *
 * For point / range, returns the current absolute character offset(s).
 * For node, returns a Path that's guaranteed to resolve in the local
 * source: either the published path itself (when the peer's node still
 * exists) or the deepest existing ancestor's path (the "nearest"
 * fallback). Returns `null` when nothing about the published position
 * can be located in our local state.
 */
export function decodeRemoteCaret(
    payload: RemoteCaret,
    yText: Y.Text,
    source: Source,
): number | Path | [number, number] | null {
    if (payload === null) return null;

    if (payload.kind === 'node') {
        return findNearestExistingPath(payload.path, source);
    }

    const doc = yText.doc;
    if (doc === null) return null;

    if (payload.kind === 'point') {
        try {
            const rp = Y.decodeRelativePosition(base64ToBytes(payload.pos));
            const ap = Y.createAbsolutePositionFromRelativePosition(rp, doc);
            return ap === null ? null : ap.index;
        } catch {
            return null;
        }
    }

    // range
    try {
        const aRp = Y.decodeRelativePosition(base64ToBytes(payload.anchor));
        const hRp = Y.decodeRelativePosition(base64ToBytes(payload.head));
        const ap = Y.createAbsolutePositionFromRelativePosition(aRp, doc);
        const hp = Y.createAbsolutePositionFromRelativePosition(hRp, doc);
        if (ap === null || hp === null) return null;
        return [ap.index, hp.index];
    } catch {
        return null;
    }
}

/**
 * Walk a Path upward until it resolves in the given source's root.
 * Returns the deepest existing ancestor's Path, or `null` when even
 * the root can't be resolved. This is the "nearest" rule from the
 * spec: a peer's node caret on a now-deleted function snaps to the
 * surviving parent instead of vanishing.
 */
function findNearestExistingPath(path: Path, source: Source): Path | null {
    let walk: Path = path;
    while (walk.length > 0) {
        if (source.root.resolvePath(walk) !== undefined) return walk;
        walk = walk.slice(0, -1);
    }
    // Empty path resolves to the root itself; if even that fails the
    // source's root isn't this source (shouldn't happen) — give up.
    return source.root.resolvePath([]) === undefined ? null : [];
}
