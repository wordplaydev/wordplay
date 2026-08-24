/**
 * Whether the page is running as an installed app rather than in a browser tab.
 * Installed windows have no browser chrome, and on iOS they have a storage
 * container separate from Safari's, so a few surfaces have to explain
 * themselves differently there (#564).
 *
 * It's a function (not a module-level constant) so it runs at call time on the
 * client and never freezes a prerendered value, matching the reasoning in
 * {@link supportsIndexedDB}.
 */
export default function isStandalone(): boolean {
    if (typeof window === 'undefined') return false;

    // iOS Safari shipped this years before it supported the `display-mode`
    // media feature, and it's still the only signal on older iPads. Typed as an
    // optional unknown rather than asserted, since it's not in lib.dom.
    const nav: Navigator & { standalone?: unknown } = window.navigator;
    if (nav.standalone === true) return true;

    if (typeof window.matchMedia !== 'function') return false;
    return ['standalone', 'minimal-ui', 'fullscreen'].some(
        (mode) => window.matchMedia(`(display-mode: ${mode})`).matches,
    );
}
