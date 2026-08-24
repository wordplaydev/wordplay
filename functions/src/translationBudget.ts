import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import type { TranslationBudgetDetails } from 'shared-types';
import { dayKeyIn, nextResetMs } from './translationDay.js';

export { dayKeyIn, nextResetMs };

/**
 * How many source characters one creator may translate per day (#1073).
 *
 * Sized so one large project translates comfortably — Heart Attack, the biggest
 * example, carries about 6,600 characters of documentation — with room for a
 * re-run. It is the whole of the per-creator defence against a Denial-of-Wallet
 * attack on the paid translation endpoints, so it is deliberately a number a
 * creator will almost never notice. It caps an account rather than a person —
 * sign-up is open, so multiplying it means minting accounts, which is #1299's
 * job (App Check), not this file's.
 *
 * The client mirrors this in src/db/translationBudget.svelte.ts purely to render
 * a meter before a creator's usage document exists; translationBudgetSync.test.ts
 * fails if the two drift.
 */
export const DAILY_TRANSLATION_CHARACTERS = 10_000;

/** How many strings one call may carry. The client chunks well below this; a
 *  request over it is a hand-rolled caller, not our UI. */
export const MAX_TEXTS_PER_CALL = 50;

/** How many source characters one call may carry, with headroom over the
 *  client's 2,000-character chunk. Bounds what a single request can cost
 *  regardless of the daily budget. */
export const MAX_CHARACTERS_PER_CALL = 3_000;

/** The Firestore collection holding server-authoritative per-creator usage.
 *  Deliberately not a field on `creators/{uid}`: that document is client-writable
 *  and the client overwrites it wholesale when settings change, so a counter
 *  there would be both forgeable and clobbered. */
const UsageCollection = 'usage';

/** What a translation costs, in Unicode code points rather than UTF-16 units, so
 *  a CJK glyph or an emoji costs what a creator would call one character. The
 *  client computes the same number to pre-check before calling. */
export function costOf(texts: string[]): number {
    return texts.reduce((total, text) => total + [...text].length, 0);
}

type Stored = { day: string; characters: number };

/** Read the stored translation usage off a usage document, tolerating absence
 *  and any shape an older or hand-edited document might have. */
function storedUsage(data: unknown): Stored {
    if (typeof data !== 'object' || data === null || !('translation' in data))
        return { day: '', characters: 0 };
    const translation = data.translation;
    if (typeof translation !== 'object' || translation === null)
        return { day: '', characters: 0 };
    const day =
        'day' in translation && typeof translation.day === 'string'
            ? translation.day
            : '';
    const characters =
        'characters' in translation &&
        typeof translation.characters === 'number' &&
        Number.isFinite(translation.characters)
            ? translation.characters
            : 0;
    return { day, characters };
}

/**
 * Reserve `characters` of today's budget for `uid`, throwing `resource-exhausted`
 * with a {@link TranslationBudgetDetails} payload if it doesn't fit.
 *
 * Charging *before* the model call rather than after is what makes the cap hold
 * against a bot: a thousand concurrent requests each pass through this
 * transaction, so they cannot race past the counter while the model is thinking.
 * {@link refund} gives the characters back when we, not the creator, fail.
 *
 * The day only ever moves forward (`candidate > stored.day`). That is what lets
 * the reset follow the creator's own midnight from a zone we don't trust: moving
 * west delays their reset, and moving east cannot conjure an early one.
 */
export async function charge(
    uid: string,
    characters: number,
    zone: string,
    now: Date = new Date(),
): Promise<TranslationBudgetDetails & { day: string }> {
    const db = getFirestore();
    const reference = db.collection(UsageCollection).doc(uid);
    const candidate = dayKeyIn(zone, now);
    const resetsAt = nextResetMs(zone, now);

    return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(reference);
        const stored = storedUsage(snapshot.data());
        const day = candidate > stored.day ? candidate : stored.day;
        const used = day === stored.day ? stored.characters : 0;

        if (used + characters > DAILY_TRANSLATION_CHARACTERS)
            throw new HttpsError(
                'resource-exhausted',
                'Daily translation budget spent.',
                {
                    used,
                    limit: DAILY_TRANSLATION_CHARACTERS,
                    resetsAt,
                } satisfies TranslationBudgetDetails,
            );

        transaction.set(
            reference,
            {
                translation: {
                    day,
                    characters: used + characters,
                    limit: DAILY_TRANSLATION_CHARACTERS,
                    // Written so the client can show the meter and the wait
                    // without recomputing the day boundary itself — one
                    // implementation of "when does this reset", not two.
                    resetsAt,
                    updated: now.toISOString(),
                },
            },
            { merge: true },
        );

        return {
            used: used + characters,
            limit: DAILY_TRANSLATION_CHARACTERS,
            resetsAt,
            day,
        };
    });
}

/**
 * Give back characters reserved for a translation that then failed on our side,
 * so a creator never pays for our refusal, truncation, or parse error.
 *
 * Only refunds while the stored day is still `day`: a refund arriving after
 * midnight must not resurrect yesterday's budget.
 */
export async function refund(
    uid: string,
    characters: number,
    day: string,
): Promise<void> {
    const db = getFirestore();
    const reference = db.collection(UsageCollection).doc(uid);
    await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(reference);
        const stored = storedUsage(snapshot.data());
        if (stored.day !== day) return;
        transaction.set(
            reference,
            {
                translation: {
                    day,
                    characters: Math.max(0, stored.characters - characters),
                },
            },
            { merge: true },
        );
    });
}
