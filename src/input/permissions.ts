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

/** Undefined where the Permissions API can't answer for this permission. */
async function getPermissionStatus(
    name: PermissionName,
): Promise<PermissionStatus | undefined> {
    if (
        typeof navigator === 'undefined' ||
        typeof navigator.permissions === 'undefined' ||
        typeof navigator.permissions.query !== 'function'
    )
        return undefined;
    try {
        // sound: the DOM lib's PermissionName omits camera and microphone,
        // though the Permissions API lists both and every engine answers them.
        return await navigator.permissions.query({
            name,
        } as PermissionDescriptor);
    } catch {
        return undefined;
    }
}

function toConsent(state: PermissionState): ConsentState {
    if (state === 'granted') return ConsentState.Granted;
    if (state === 'denied') return ConsentState.Denied;
    return ConsentState.Unknown;
}

/**
 * Query the browser's current permission state, without prompting.
 * Returns 'unsupported' if the Permissions API does not recognize the name
 * (Safari/Firefox don't support 'microphone'/'camera' queries in all versions).
 */
export async function queryPermission(
    name: PermissionName,
): Promise<ConsentState | 'unsupported'> {
    const status = await getPermissionStatus(name);
    return status === undefined ? 'unsupported' : toConsent(status.state);
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

/**
 * Ask the browser for a permission directly, from inside a click handler. WebKit
 * refuses a repeat request without prompting unless it carries a user gesture,
 * and a stream's own request arrives after the click has ended, so the gate and
 * the retry button ask here first. Resolves to whether access was given.
 */
export function requestAccess(name: PermissionName): Promise<boolean> {
    if (
        typeof navigator === 'undefined' ||
        typeof navigator.mediaDevices?.getUserMedia !== 'function'
    )
        return Promise.resolve(false);
    return navigator.mediaDevices
        .getUserMedia(
            name === Permission.Microphone ? { audio: true } : { video: true },
        )
        .then((stream) => {
            // Only the decision matters; the stream asks again for its own.
            stream.getTracks().forEach((track) => track.stop());
            return true;
        })
        .catch(() => false);
}

/** Report changes to a permission, such as allowing it in site settings
 *  after blocking it. Returns a function that stops watching. */
export function watchPermission(
    name: PermissionName,
    onChange: (state: ConsentState) => void,
): () => void {
    let status: PermissionStatus | undefined = undefined;
    let stopped = false;
    const listener = () => {
        if (status !== undefined) onChange(toConsent(status.state));
    };
    getPermissionStatus(name).then((result) => {
        if (stopped || result === undefined) return;
        status = result;
        status.addEventListener('change', listener);
    });
    return () => {
        stopped = true;
        status?.removeEventListener('change', listener);
    };
}

export type BrowserFamily = 'chromium' | 'safari' | 'firefox' | 'other';

/** Which browser's settings steps to show. Non-Safari iOS browsers keep access
 *  in the system Settings app, so they get the general steps. */
export function getBrowserFamily(userAgent: string): BrowserFamily {
    if (/CriOS|FxiOS|EdgiOS/.test(userAgent)) return 'other';
    if (/Firefox\//.test(userAgent)) return 'firefox';
    if (/Chrome\/|Chromium\/|Edg\//.test(userAgent)) return 'chromium';
    if (/Safari\//.test(userAgent)) return 'safari';
    return 'other';
}
