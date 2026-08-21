/**
 * When a creator's translation day begins and ends.
 *
 * Deliberately dependency-free: it is the only part of the budget with rules
 * subtle enough to be worth testing on its own (a monotonic day key is what
 * makes an untrusted time zone safe), and a test can only run it if importing
 * it doesn't drag in the Firebase runtime.
 */

/**
 * The `YYYY-MM-DD` day in the given IANA zone. `en-CA` is the locale that formats
 * exactly that way, which matters because the key is compared lexicographically.
 * An unrecognized or hostile zone degrades to UTC rather than throwing.
 */
export function dayKeyIn(zone: string, at: Date): string {
    try {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: zone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(at);
    } catch {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'UTC',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(at);
    }
}

/** When the budget next resets, in epoch milliseconds: the first instant whose
 *  day key in `zone` is later than `at`'s. Found by stepping hour by hour, which
 *  is correct across every DST shift and offset (including the half-hour and
 *  three-quarter-hour ones) without any offset arithmetic. */
export function nextResetMs(zone: string, at: Date): number {
    const today = dayKeyIn(zone, at);
    // 26 hours covers a full day plus the largest DST shift.
    for (let hour = 1; hour <= 26; hour++) {
        const later = new Date(at.getTime() + hour * 3_600_000);
        if (dayKeyIn(zone, later) > today) {
            // Back off to the minute the day actually turns.
            for (let minute = 59; minute >= 0; minute--) {
                const earlier = new Date(later.getTime() - minute * 60_000);
                if (dayKeyIn(zone, earlier) > today)
                    return earlier.getTime() - (earlier.getTime() % 60_000);
            }
            return later.getTime();
        }
    }
    return at.getTime() + 24 * 3_600_000;
}
