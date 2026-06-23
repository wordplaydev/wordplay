/**
 * True if a keydown belongs to an active IME composition (e.g. a Korean jamo
 * being combined into a syllable), and so must NOT be treated as a signal that
 * a stuck composition should be force-ended.
 *
 * We can't rely on `event.isComposing` alone: on macOS Chrome with 2-Set Korean
 * it is intermittently `false` on syllable-boundary keydowns even though a
 * composition is genuinely in progress (see #1054). `keyCode === 229` is the
 * stable, cross-browser signal that "the IME is processing this key", so we
 * also honor it. Real keys that should end a stuck composition (arrows, Enter,
 * letters) report their own keyCode, never 229.
 */
export default function isComposingKeyDown(
    event: Pick<KeyboardEvent, 'isComposing' | 'keyCode'>,
): boolean {
    return event.isComposing || event.keyCode === 229;
}
