/** Whether this device supports touch input. Used to surface tappable
 * alternatives to keyboard-only affordances (editor touch commands, the
 * stage's key pad). */
export const TouchSupported =
    typeof window !== 'undefined' && 'ontouchstart' in window;

export default TouchSupported;
