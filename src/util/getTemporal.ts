// The /full entry includes all Unicode calendars (hebrew, japanese, chinese, …),
// which Moment and Now support; the default entry is ISO/Gregorian-only.
import type { Temporal as TemporalAPI } from 'temporal-polyfill/full';

/** Recognize a native Temporal namespace object, typing it with the polyfill's
 *  spec-identical declarations so the rest of the codebase uses one set of types. */
function isTemporal(value: unknown): value is typeof TemporalAPI {
    return (
        typeof value === 'object' &&
        value !== null &&
        'Now' in value &&
        'ZonedDateTime' in value
    );
}

const native: unknown = Reflect.get(globalThis, 'Temporal');

/**
 * The Temporal API: native where the engine ships it, otherwise the polyfill,
 * fetched lazily via dynamic import so Temporal-native browsers never download
 * it. The top-level await makes every importer wait for whichever source wins,
 * so Temporal is always ready before any evaluation can touch it. Native and
 * polyfill calendar math are both spec-defined; user-visible date text comes
 * from our own deterministic formatter either way (see locale/dateTimeFormats).
 */
export const Temporal: typeof TemporalAPI = isTemporal(native)
    ? native
    : (await import('temporal-polyfill/full')).Temporal;

/** Re-export the polyfill's types for signatures (e.g. TemporalTypes.ZonedDateTime). */
export type { TemporalAPI as TemporalTypes };
