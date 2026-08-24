import { firestore } from '@db/firebase';
import type { TranslationBudgetDetails } from 'shared-types';

/**
 * The daily per-creator translation budget, mirrored from the server's
 * `DAILY_TRANSLATION_CHARACTERS` in functions/src/translationBudget.ts.
 *
 * This copy is a *display default only*, for the meter shown before a creator
 * has translated anything and so has no usage document yet; whenever the
 * document exists, its own `limit` wins. The server is always the authority.
 * translationBudgetSync.test.ts fails if the two numbers drift.
 */
export const DAILY_TRANSLATION_CHARACTERS = 10_000;

/** Why a translation request was refused, when it wasn't the model's fault. */
export type TranslationRefusal = 'over-budget' | 'unauthenticated' | 'failed';

/**
 * The creator's translation budget, as a module-level store so every surface
 * that translates — the project languages dialog now, chat and how-tos later —
 * shares one meter and one error without plumbing. Same pattern as
 * [notifications](src/db/notifications.svelte.ts).
 */
export const budget = $state<{
    /** Characters spent today, as the server counts them. */
    used: number;
    /** Characters allowed per day; the server's number once it has written one. */
    limit: number;
    /** When today's budget resets, in epoch milliseconds, if the server has said. */
    resetsAt: number | undefined;
    /** Why the last translation was refused, if it was. */
    refusal: TranslationRefusal | undefined;
}>({
    used: 0,
    limit: DAILY_TRANSLATION_CHARACTERS,
    resetsAt: undefined,
    refusal: undefined,
});

/** The creator's IANA time zone, sent with every translation request so the
 *  budget resets at their own midnight. The server treats it as advisory: it
 *  only ever moves the stored day forward, so a spoofed zone can delay a reset
 *  but never buy an early one. */
export function localZone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
        return 'UTC';
    }
}

/** How many characters of today's budget are left. */
export function remaining(): number {
    return Math.max(0, budget.limit - budget.used);
}

/** Whether the value carries a Firebase callable error code. */
function hasCode(value: unknown): value is { code: string } {
    return (
        typeof value === 'object' &&
        value !== null &&
        'code' in value &&
        typeof value.code === 'string'
    );
}

/** Whether the value carries budget details on a resource-exhausted rejection. */
function hasBudgetDetails(
    value: unknown,
): value is { details: TranslationBudgetDetails } {
    if (typeof value !== 'object' || value === null || !('details' in value))
        return false;
    const details = value.details;
    return (
        typeof details === 'object' &&
        details !== null &&
        'used' in details &&
        typeof details.used === 'number' &&
        'limit' in details &&
        typeof details.limit === 'number' &&
        'resetsAt' in details &&
        typeof details.resetsAt === 'number'
    );
}

/**
 * Classify a rejection from a translation callable and record it, so the caller
 * can explain the failure.
 *
 * This exists because `translateProjectContent` catches everything and returns
 * `null`, so a thrown `resource-exhausted` can never reach the dialog as a
 * distinguishable value. Widening the `RawTranslator` contract would churn the
 * CLI translator and its tests for a case the client's pre-check already
 * prevents; recording the reason here costs a field, and is written strictly
 * before the `null` propagates, so reading it after a `null` is deterministic.
 */
export function noteTranslationRefusal(error: unknown): TranslationRefusal {
    if (hasCode(error) && error.code === 'functions/resource-exhausted') {
        if (hasBudgetDetails(error)) {
            budget.used = error.details.used;
            budget.limit = error.details.limit;
            budget.resetsAt = error.details.resetsAt;
        } else {
            // Assume it's spent even without details, so the meter doesn't
            // claim room the server just said isn't there.
            budget.used = budget.limit;
        }
        budget.refusal = 'over-budget';
    } else if (hasCode(error) && error.code === 'functions/unauthenticated')
        budget.refusal = 'unauthenticated';
    else budget.refusal = 'failed';
    return budget.refusal;
}

/** Clear the last refusal, when a new translation starts or a dialog reopens. */
export function resetTranslationRefusal() {
    budget.refusal = undefined;
}

/**
 * Watch a creator's server-side usage, returning an unsubscribe function.
 *
 * Started and stopped by whatever renders the meter, so a creator who never
 * opens a translation surface carries no listener. Because the server charges
 * per chunk, this also makes the meter fall as a translation proceeds.
 */
export function subscribeTranslationBudget(uid: string): () => void {
    let stop: (() => void) | undefined;
    let stale = false;
    Promise.all([
        import('firebase/firestore'),
        Promise.resolve(firestore),
    ]).then(([{ doc, onSnapshot }, fs]) => {
        if (stale || fs === undefined) return;
        stop = onSnapshot(
            doc(fs, 'usage', uid),
            (snapshot) => {
                const data = snapshot.data();
                const translation =
                    data !== undefined &&
                    typeof data.translation === 'object' &&
                    data.translation !== null
                        ? data.translation
                        : undefined;
                // Yesterday's spend isn't today's: the server resets the
                // counter on the next charge, so a meter that read the stored
                // number would show a creator as spent until they translated.
                // The server writes when the day turns, so this doesn't have to
                // work it out a second way.
                const resetsAt =
                    typeof translation?.resetsAt === 'number'
                        ? translation.resetsAt
                        : undefined;
                const current = resetsAt === undefined || resetsAt > Date.now();
                budget.resetsAt = resetsAt;
                budget.used =
                    typeof translation?.characters === 'number' && current
                        ? translation.characters
                        : 0;
                budget.limit =
                    typeof translation?.limit === 'number'
                        ? translation.limit
                        : DAILY_TRANSLATION_CHARACTERS;
            },
            // A creator offline or without a usage document isn't over budget;
            // leave the meter at whatever it last knew.
            () => undefined,
        );
    });
    return () => {
        stale = true;
        stop?.();
    };
}
