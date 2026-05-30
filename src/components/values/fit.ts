/**
 * Character budget for the default collapsed window of a value view. Tuned so a
 * few short items show, but a single very long item collapses to just itself.
 */
export const DEFAULT_BUDGET = 40;

/**
 * Decide how many leading units to show by default, given a per-unit size
 * estimate. Returns the count whose cumulative size stays within `budget`,
 * always at least 1 (so something shows) and never more than `length`.
 *
 * `size` is a lazy accessor rather than a precomputed array on purpose: a unit's
 * size estimate is typically `value.toWordplay().length`, and `toWordplay()`
 * recurses into nested values (a list-of-lists serializes its whole subtree).
 * Because this loop early-exits once the budget is exceeded, only the handful of
 * leading units that fit are ever measured — not all `length` of them.
 */
export function fitCount(
    size: (index: number) => number,
    length: number,
    budget = DEFAULT_BUDGET,
): number {
    let total = 0;
    for (let i = 0; i < length; i++) {
        total += size(i);
        if (total > budget) return Math.max(1, i);
    }
    return Math.max(1, length);
}
