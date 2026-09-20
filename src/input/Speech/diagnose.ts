import type { SpeechError } from './Speech';

/**
 * What the stream should do about one Web Speech API error.
 *
 * `deny` means the creator refused the microphone; `ignore` means the error is
 * part of normal listening and the reader should hear nothing about it.
 */
export type SpeechDiagnosis =
    | { action: 'deny' }
    | { action: 'ignore' }
    | { action: 'report'; error: SpeechError; retry: boolean };

/**
 * Whether the device says it is offline. Guarded because the stream is
 * constructed in Node during analysis, where there is no navigator.
 */
export function isOffline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * The Web Speech API reports `network` for two very different things: the
 * device is offline, or the browser ships no reachable speech service. Brave,
 * Arc and most Chromium builds that aren't Chrome have the constructor but no
 * service, so they fail this way on every attempt forever — telling those
 * readers to check their internet sends them after a problem they don't have.
 * Only one of the two is theirs to fix, and `navigator.onLine` is what
 * separates them.
 */
export function diagnose(code: string, offline: boolean): SpeechDiagnosis {
    switch (code) {
        case 'network':
            return {
                action: 'report',
                error: offline ? 'noConnection' : 'serviceNotAllowed',
                retry: true,
            };
        case 'service-not-allowed':
            return {
                action: 'report',
                error: 'serviceNotAllowed',
                retry: true,
            };
        case 'not-allowed':
            return { action: 'deny' };
        case 'audio-capture':
            return { action: 'report', error: 'noMicrophone', retry: true };
        case 'language-not-supported':
            // Retrying cannot change the answer, so this one stops.
            return {
                action: 'report',
                error: 'languageNotSupported',
                retry: false,
            };
        // Silence is normal: `no-speech` is a pause, `aborted` is us stopping.
        case 'no-speech':
        case 'aborted':
            return { action: 'ignore' };
        default:
            // An unknown code is far more likely to be the service than the
            // reader's connection, so don't claim they are offline.
            return {
                action: 'report',
                error: 'serviceNotAllowed',
                retry: true,
            };
    }
}

/**
 * What to say once the retries are spent. A browser with no speech service
 * fails identically every time, so exhausting the retries while online is the
 * first moment we can honestly say the browser doesn't support this — the
 * check in `start()` can only see whether the constructor exists, which in
 * those browsers it does.
 */
export function diagnoseExhaustion(serviceUnreachable: boolean): SpeechError {
    return serviceUnreachable ? 'browserNotSupported' : 'limit';
}
