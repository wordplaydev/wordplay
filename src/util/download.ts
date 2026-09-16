/**
 * Hands the reader a file to save.
 *
 * The one existing copy of this in the app (the class roster CSV) never revokes
 * its object URL, so every download leaks the whole file until the tab closes —
 * which matters much more for an account archive, since that one is megabytes.
 * Revoked on the next task rather than immediately: a revoke in the same tick
 * races the browser's own read of the URL in some versions of Safari.
 */
export default function downloadBytes(
    bytes: Uint8Array,
    name: string,
    type: string,
): void {
    // A Uint8Array may be a window onto a larger buffer, so hand Blob a buffer
    // holding exactly these bytes rather than the one underneath them. Copied
    // rather than sliced: `bytes.buffer` is an `ArrayBufferLike`, which may be
    // a `SharedArrayBuffer` that `Blob` will not take.
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    const url = URL.createObjectURL(new Blob([buffer], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    // Appended because Firefox ignores a click on a link that is not in the
    // document.
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 0);
}
