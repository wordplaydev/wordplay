/**
 * Whether this runtime can vibrate. The single source of truth for the check
 * that both the beat's vibration call and the settings chooser need, so a
 * device can never be offered a toggle that silently does nothing.
 *
 * It's a function (not a module-level constant) so it runs at call time on the
 * client and never freezes a build/SSR value: during prerender there is no
 * `navigator`, so it returns false.
 */
export default function supportsVibration(): boolean {
    return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}
