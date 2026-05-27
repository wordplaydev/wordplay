import { writable, get, type Writable } from 'svelte/store';

/**
 * The browser permissions Wordplay streams can require. The string values match
 * the names the browser's Permissions API uses, so the same value can be passed
 * to `navigator.permissions.query({name: ...})` without translation.
 */
export const Permission = {
    Microphone: 'microphone',
    Camera: 'camera',
} as const;
export type PermissionName = (typeof Permission)[keyof typeof Permission];

/** All defined permissions, in a stable order for UI iteration. */
export const AllPermissions: readonly PermissionName[] = [
    Permission.Microphone,
    Permission.Camera,
];

/**
 * The user's consent state for a browser permission.
 * - 'granted': already granted (either by the browser or by clicking Start)
 * - 'denied': explicitly denied (browser or our exception UI)
 * - 'unknown': not yet queried or decided
 */
export const ConsentState = {
    Granted: 'granted',
    Denied: 'denied',
    Unknown: 'unknown',
} as const;
export type ConsentState = (typeof ConsentState)[keyof typeof ConsentState];

type ConsentMap = Record<PermissionName, ConsentState>;

/** A shared store of consent state, observed by both the splash UI and the evaluator-gating logic. */
export const consent: Writable<ConsentMap> = writable({
    [Permission.Microphone]: ConsentState.Unknown,
    [Permission.Camera]: ConsentState.Unknown,
});

/** Read a single permission's current consent state. */
export function getConsent(name: PermissionName): ConsentState {
    return get(consent)[name];
}

/** Mark a permission as granted (user clicked Start in the splash, or browser reported granted). */
export function grantConsent(name: PermissionName) {
    consent.update((c) => ({ ...c, [name]: ConsentState.Granted }));
}

/** Mark a permission as denied (browser rejected getUserMedia). */
export function denyConsent(name: PermissionName) {
    consent.update((c) => ({ ...c, [name]: ConsentState.Denied }));
}

/**
 * Query the browser's current permission state, without prompting.
 * Returns 'unsupported' if the Permissions API does not recognize the name
 * (Safari/Firefox don't support 'microphone'/'camera' queries in all versions).
 */
export async function queryPermission(
    name: PermissionName,
): Promise<ConsentState | 'unsupported'> {
    if (
        typeof navigator === 'undefined' ||
        typeof navigator.permissions === 'undefined' ||
        typeof navigator.permissions.query !== 'function'
    )
        return 'unsupported';
    try {
        const status = await navigator.permissions.query({
            name,
        } as PermissionDescriptor);
        if (status.state === 'granted') return ConsentState.Granted;
        if (status.state === 'denied') return ConsentState.Denied;
        return ConsentState.Unknown;
    } catch {
        return 'unsupported';
    }
}

/**
 * Refresh consent for a permission by querying the browser. If the browser says
 * granted, mark our consent granted so the splash skips. If the browser says
 * denied, leave consent as-is (user can still try via Start, and the stream's
 * own getUserMedia call will surface the denial as a PermissionException).
 */
export async function refreshConsentFromBrowser(name: PermissionName) {
    const state = await queryPermission(name);
    if (state === ConsentState.Granted) grantConsent(name);
}
