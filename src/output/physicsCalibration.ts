/**
 * Physics calibration constants shared by Physics.ts and Motion.ts.
 *
 * These live in their own module (rather than Physics.ts) because Motion needs
 * them as a runtime value: importing them from Physics.ts would make Motion's
 * import of Physics non-type-only, pulling Physics's @db/Database import (and
 * its SvelteKit $env dependency) into non-Vite runtimes like the locale
 * verifier's tsx, and creating a Motion↔Physics module cycle.
 */

/** Velocity calibration. Matter.js velocities were px per 16.7ms frame and
 *  Wordplay passed Velocity's m/s numbers straight through, so the effective
 *  speed was v × 60 px/s. Rapier velocities are px/s; scale by 60 to keep
 *  every existing project's tuned velocities feeling identical. */
export const VelocityPxPerSecond = 60;
