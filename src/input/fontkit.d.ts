import 'fontkit';

// fontkit's browser build (which Vite resolves) accepts a Uint8Array, not only
// a Node Buffer. @types/fontkit only declares the Node `Buffer` signature, so we
// add an overload that accepts a Uint8Array. Declaration merging adds this as an
// additional overload rather than replacing the existing one.
declare module 'fontkit' {
    export function create(
        buffer: Uint8Array,
        postscriptName?: string,
    ): Font | FontCollection;
}
