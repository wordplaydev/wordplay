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

/** The part of a gamepad that rumbling reads. lib.dom types
 *  `vibrationActuator` as always present, but it is null on a pad (or in a
 *  browser) that can't rumble. */
export type Rumbler = {
    readonly vibrationActuator?: Pick<
        GamepadHapticActuator,
        'playEffect'
    > | null;
};

/** A gamepad with motors. */
export function canRumble(pad: Rumbler | null | undefined): pad is Rumbler & {
    vibrationActuator: Pick<GamepadHapticActuator, 'playEffect'>;
} {
    return (
        pad !== null &&
        pad !== undefined &&
        typeof pad.vibrationActuator?.playEffect === 'function'
    );
}

/** The connected gamepads, or none where there is no Gamepad API (SSR, tests). */
export function connectedGamepads(): readonly (Rumbler | null)[] {
    return typeof navigator !== 'undefined' &&
        typeof navigator.getGamepads === 'function'
        ? navigator.getGamepads()
        : [];
}

/** Whether any connected gamepad can rumble. A browser reveals a gamepad only
 *  after one of its buttons is pressed while the page has focus. */
export function hasRumblingGamepad(): boolean {
    return connectedGamepads().some(canRumble);
}
