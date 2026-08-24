/**
 * Open a URL in a new window, from inside a click handler.
 *
 * The only place in the app that opens a window rather than navigating: the
 * guide's "test it" button, which has to leave the guide where it is.
 *
 * Two subtleties make this a function rather than an inline `window.open`.
 * A popup blocker rejects a window that isn't opened during a user gesture, so
 * the caller must not await anything first — and when one is rejected anyway,
 * `open` returns null and navigating in place is far better than a button that
 * appears to do nothing.
 *
 * The second is why `noopener` isn't in the feature string, despite being the
 * usual advice: with it, `open` returns null *by specification*, whether or not
 * the window opened. That's indistinguishable from a blocked popup, so the
 * fallback fired every time and navigated the page the reader was on — opening
 * the project and losing the guide in the same gesture. The window we open is
 * our own same-origin page, so what `noopener` protects against doesn't apply.
 */
export default function openWindow(url: string): void {
    const opened = window.open(url, '_blank');
    if (opened === null) window.location.href = url;
}
