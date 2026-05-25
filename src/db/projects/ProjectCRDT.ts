import * as Y from 'yjs';

/**
 * # What a CRDT is, in plain language
 *
 * A Conflict-free Replicated Data Type is a data structure designed so
 * that two copies of it can be edited independently, then merged, and
 * the result will always be the same on both sides — no central
 * coordinator, no merge conflicts, no human resolution. The "magic"
 * comes from carefully picking the data shape so that every possible
 * operation commutes with every other (Alice typing "x" then Bob
 * typing "y" produces the same string as Bob then Alice).
 *
 * Stamps (see VectorClock.ts) give us this property for *pick-one*
 * metadata fields like `name` and `gallery`. But source code can't be
 * picked one or the other — two collaborators typing in different
 * functions should both see both sets of keystrokes interleaved
 * correctly. That's what a text CRDT does.
 *
 * # Why Yjs
 *
 * Yjs (yjs.dev) is the most mature open-source text CRDT for the web.
 * It gives us:
 *   - A `Y.Doc` container that holds typed CRDT data structures.
 *   - A `Y.Text` per source file. Edits become small binary "updates"
 *     that are commutative — apply them in any order, get the same
 *     final string.
 *   - `Y.encodeStateAsUpdateV2` to take a snapshot of the full state,
 *     and `Y.applyUpdateV2` to apply someone else's updates to ours.
 *
 * # How this class fits into Wordplay
 *
 * One `ProjectCRDT` instance per *editable* project — including solo
 * ones, not just multi-collaborator. Inside it lives one `Y.Doc`,
 * with one `Y.Text` per Source keyed by the source's index in the
 * project. The class is the authoritative source of truth for source
 * code: local edits flow through {@link applyLocalEdit}, remote
 * updates from peers flow through {@link applyRemoteUpdate}, and
 * {@link encode} produces the base64 snapshot we persist into the
 * project doc's `crdt` field.
 *
 * # Why even solo projects activate the CRDT
 *
 * The #135 reproduction (offline rename on one device, online code
 * edit on another) doesn't require multiple users — the same person
 * on two devices triggers it. Stamps handle the metadata side of
 * that, but the code side needs the CRDT's character-level merge to
 * avoid losing keystrokes. So we activate the CRDT for every project,
 * including ones with only the owner. The cost is bounded (one
 * Firestore listener + a 5s heartbeat per project) and the
 * correctness payoff covers the whole class of #135-style bugs.
 *
 * What's hidden in the solo case is the *UI*: RemoteCarets and
 * RemoteCaretOverlay render nothing when there are no actual remote
 * peers in the presence map, so a solo user editing alone sees no
 * collaborative chrome. The merge is invisible — it just works.
 *
 * Source identity is keyed by position in the project's `sources`
 * array. If a future schema bump introduces stable per-source UUIDs,
 * swap the key here.
 */
export default class ProjectCRDT {
    /** The Yjs document holding per-source Y.Texts. */
    private readonly doc: Y.Doc;

    /** Listeners to call when a Y.Text inside the doc changes locally or remotely. */
    private readonly listeners = new Set<
        (sourceIndex: number, code: string) => void
    >();

    constructor(doc?: Y.Doc) {
        this.doc = doc ?? new Y.Doc();
        this.doc.on('update', (_update, origin) => this.fire(origin));
    }

    /**
     * Load a ProjectCRDT from a base64 snapshot produced by {@link encode},
     * or create an empty one if `snapshot` is null/empty.
     */
    static fromSnapshot(snapshot: string | null): ProjectCRDT {
        const crdt = new ProjectCRDT();
        if (snapshot !== null && snapshot.length > 0) {
            try {
                Y.applyUpdateV2(crdt.doc, base64ToBytes(snapshot));
            } catch (err) {
                console.error('Failed to decode CRDT snapshot', err);
            }
        }
        return crdt;
    }

    /**
     * Initialize the CRDT from a list of plain-string source codes (used when
     * a solo project gains its first collaborator and we promote it into
     * CRDT-tracked storage).
     */
    static fromSources(codes: string[]): ProjectCRDT {
        const crdt = new ProjectCRDT();
        crdt.doc.transact(() => {
            for (let i = 0; i < codes.length; i++) {
                crdt.getYText(i).insert(0, codes[i]);
            }
        }, 'init');
        return crdt;
    }

    /** Return the Y.Text for a given source index, creating it lazily. */
    getYText(sourceIndex: number): Y.Text {
        return this.doc.getText(`source:${sourceIndex}`);
    }

    /** Read the current materialized text for a source index. */
    getCode(sourceIndex: number): string {
        return this.getYText(sourceIndex).toString();
    }

    /**
     * Translate a string-level edit ("the code went from `oldCode` to
     * `newCode`") into the CRDT primitives Y.Text understands
     * (insert/delete at a position). The simplest possible diff —
     * trim the common prefix and suffix, replace the middle in one
     * transaction — gives precise operations for the common cases:
     * one keystroke is one insert, deleting a selection is one
     * delete, paste is an insert at the cursor. We don't need a
     * full LCS-based text diff because we re-emit on every revise
     * (so individual diffs stay tiny).
     *
     * `origin` is Yjs's way of tagging where an update came from.
     * The 'local' tag tells listeners (most importantly the Firestore
     * provider) to publish this update to peers; the 'remote' tag on
     * incoming updates ({@link applyRemoteUpdate}) prevents the
     * provider from echoing peer changes back to peers.
     */
    applyLocalEdit(
        sourceIndex: number,
        oldCode: string,
        newCode: string,
        origin: unknown = 'local',
    ): void {
        if (oldCode === newCode) return;
        const ytext = this.getYText(sourceIndex);
        this.doc.transact(() => {
            let start = 0;
            const oldLen = oldCode.length;
            const newLen = newCode.length;
            const minLen = Math.min(oldLen, newLen);
            while (start < minLen && oldCode[start] === newCode[start])
                start++;
            let oldEnd = oldLen;
            let newEnd = newLen;
            while (
                oldEnd > start &&
                newEnd > start &&
                oldCode[oldEnd - 1] === newCode[newEnd - 1]
            ) {
                oldEnd--;
                newEnd--;
            }
            if (oldEnd > start) ytext.delete(start, oldEnd - start);
            if (newEnd > start)
                ytext.insert(start, newCode.slice(start, newEnd));
        }, origin);
    }

    /**
     * Apply a binary update produced by some other replica's Y.Doc.
     * Yjs's update format is *commutative* (it doesn't matter in which
     * order updates arrive) and *idempotent* (applying the same update
     * twice is a no-op). Those two properties together are what let
     * Wordplay use Firestore as a simple "log of updates" transport
     * without any server-side coordination — every browser converges
     * to the same final state just by applying whatever updates land
     * in the subcollection.
     *
     * The 'remote' origin tag prevents YjsFirestoreProvider from
     * re-publishing this update back to peers, which would otherwise
     * loop forever.
     */
    applyRemoteUpdate(update: Uint8Array): void {
        Y.applyUpdateV2(this.doc, update, 'remote');
    }

    /** Encode the full CRDT state for snapshot persistence. */
    encode(): string {
        return bytesToBase64(Y.encodeStateAsUpdateV2(this.doc));
    }

    /** Encode the current state-vector for fast diff requests. */
    encodeStateVector(): Uint8Array {
        return Y.encodeStateVector(this.doc);
    }

    /** Encode only the updates not yet observed by the given state-vector. */
    encodeDiff(stateVector: Uint8Array): Uint8Array {
        return Y.encodeStateAsUpdateV2(this.doc, stateVector);
    }

    /** Subscribe to changes — callback gets (sourceIndex, newCode) for each
     *  source whose text changed in the update batch. */
    onChange(
        fn: (sourceIndex: number, code: string) => void,
    ): () => void {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    /** Tear down the underlying Y.Doc. */
    destroy(): void {
        this.listeners.clear();
        this.doc.destroy();
    }

    /** Exposed to the Firestore provider so it can `.on('update', ...)`
     *  and forward binary updates to the realtime subcollection. Treat
     *  this as a low-level handle, not part of the public API. */
    getInternalDoc(): Y.Doc {
        return this.doc;
    }

    /** Internal: enumerate which source indices currently have Y.Texts. */
    getKnownSourceIndices(): number[] {
        const out: number[] = [];
        for (const key of this.doc.share.keys()) {
            const match = /^source:(\d+)$/.exec(key);
            if (match !== null) out.push(parseInt(match[1], 10));
        }
        return out.sort((a, b) => a - b);
    }

    private fire(origin: unknown): void {
        if (this.listeners.size === 0) return;
        for (const index of this.getKnownSourceIndices()) {
            const code = this.getCode(index);
            for (const fn of this.listeners) fn(index, code);
        }
        // origin is exposed via doc.on('update', (_, origin)) — currently
        // not surfaced to listeners; Stage 3's Firestore provider reads it
        // directly from the Y.Doc's update event.
        void origin;
    }
}

/** Base64 helpers — Yjs updates are binary and need string-safe transport.
 *  Exported so the Firestore provider (Stage 3) can encode/decode update
 *  bytes for storage in subcollection documents. */
export function bytesToBase64(bytes: Uint8Array): string {
    if (typeof Buffer !== 'undefined')
        return Buffer.from(bytes).toString('base64');
    let str = '';
    for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
    return btoa(str);
}

export function base64ToBytes(b64: string): Uint8Array {
    if (typeof Buffer !== 'undefined')
        return new Uint8Array(Buffer.from(b64, 'base64'));
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}
