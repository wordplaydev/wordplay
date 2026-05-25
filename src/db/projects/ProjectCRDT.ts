import * as Y from 'yjs';

/**
 * Wraps a Y.Doc that holds one Y.Text per Source in a project. Used only
 * when a project has active collaborators — solo projects bypass this
 * entirely and keep using plain-string Source.code.
 *
 * Source identity is keyed by position in the project's `sources` array.
 * If a future schema bump introduces per-source UUIDs, swap the key here.
 *
 * The ProjectCRDT is the source of truth for source code while
 * collaboration is active. Project.serialize() persists its current state
 * as a base64 snapshot in `SerializedProject.crdt`. Realtime updates
 * (Stage 3) are streamed via a Firestore subcollection of binary update
 * blobs and merged here via {@link applyRemoteUpdate}.
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
     * Apply a local string-level edit by diffing `oldCode` against
     * `newCode` and emitting precise Y.Text operations — typically a
     * single insert or delete for a single keystroke, larger ranges
     * for paste/replace operations. The diff is the common-prefix /
     * common-suffix trim; the middle is replaced atomically.
     *
     * Wrapped in a doc transaction with the given `origin` so listeners
     * can filter their own writes when bridging to remote replicas.
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
     * Apply an incoming binary Yjs update from another replica. Marked with
     * origin='remote' so local listeners can ignore round-trips of their own
     * edits (when implementing the Firestore provider in Stage 3).
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
