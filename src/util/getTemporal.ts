// The /full entry includes all Unicode calendars (hebrew, japanese, chinese, …),
// which Moment and Now support; the default entry is ISO/Gregorian-only.
import type { Temporal as TemporalAPI } from 'temporal-polyfill/full';
import * as TemporalPolyfill from 'temporal-polyfill/full';

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
 * The Temporal API: native where the engine ships it, otherwise the polyfill.
 * Imported statically so Temporal is synchronously ready before any evaluation
 * touches it — the interpreter (Evaluator, streams, Now/Moment) is fully
 * synchronous. A module-level `await` here would make this whole subgraph async
 * and reorder WebKit's module evaluation across the app's route↔db import cycle,
 * crashing hydration with a "Cannot access 'component' before initialization"
 * TDZ error. Native and polyfill calendar math are both spec-defined; user-
 * visible date text comes from our own deterministic formatter either way (see
 * locale/dateTimeFormats).
 */
export const Temporal: typeof TemporalAPI = isTemporal(native)
    ? native
    : TemporalPolyfill.Temporal;

/** Re-export the polyfill's types for signatures (e.g. TemporalTypes.ZonedDateTime). */
export type { TemporalAPI as TemporalTypes };
