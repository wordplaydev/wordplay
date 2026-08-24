import type { RawTranslator } from '@db/translateMarkup';
import {
    localZone,
    noteTranslationRefusal,
    type TranslationRefusal,
} from '@db/translationBudget.svelte';
import { localeToString } from '@locale/Locale';
import {
    BROWSER_CHUNK_CHARACTERS,
    BROWSER_CHUNK_SIZE,
    chunkUnits,
} from '@util/chunkUnits';
import type { Functions } from 'firebase/functions';
import type {
    GetLLMTranslationsInputs,
    GetLLMTranslationsOutput,
} from 'shared-types';

/** How far a translation has got, for a caller that wants to show progress. */
export type TranslationProgress = {
    /** Strings translated so far. */
    done: number;
    /** Strings in total. */
    total: number;
    /** Of those done, how many came back with no translation and so keep their
     *  original words. */
    kept: number;
};

/**
 * How long the client waits for one chunk. The callable SDK's default is 70
 * seconds, which a chunk of documentation can exceed on a slow script — raising
 * the function's own timeout without raising this one would still fail. Matches
 * the function's `timeoutSeconds`.
 */
const CallableTimeout = 300_000;

/**
 * The app's translation backend: the `getLLMTranslations` callable, wrapped as a
 * [RawTranslator](src/db/translateMarkup.ts) so every translating surface —
 * project translation now, chat and how-tos later — shares one path, and so the
 * daily budget applies to all of them at once rather than per feature.
 *
 * It chunks rather than sending everything at once. That is what makes progress
 * reportable at all, keeps a large project from failing wholesale when one
 * response hits the output cap, and keeps what a creator has already paid for
 * when the budget runs out partway through: a chunk that fails leaves only its
 * own strings untranslated, since `RawTranslator` already permits per-item
 * `undefined`. Only an entirely failed translation returns `null`.
 */
export default function getFirebaseTranslator(
    functions: Functions,
    options?: { progress?: (progress: TranslationProgress) => void },
): RawTranslator {
    return async (texts, from, to, context) => {
        const { httpsCallable } = await import('firebase/functions');
        const call = httpsCallable<
            GetLLMTranslationsInputs,
            GetLLMTranslationsOutput
        >(functions, 'getLLMTranslations', { timeout: CallableTimeout });

        const chunks = chunkUnits(
            texts,
            BROWSER_CHUNK_SIZE,
            BROWSER_CHUNK_CHARACTERS,
        );

        const results: (string | undefined)[] = [];
        let succeeded = false;
        let done = 0;
        let refusal: TranslationRefusal | undefined = undefined;

        for (const chunk of chunks) {
            let translations: GetLLMTranslationsOutput = null;
            try {
                translations = (
                    await call({
                        from: localeToString(from),
                        to: localeToString(to),
                        texts: chunk,
                        zone: localZone(),
                        ...(context ? { projectContext: context } : {}),
                    })
                ).data;
            } catch (error) {
                // Records why, so the caller can distinguish "out of budget"
                // from "translation failed" once it sees the result.
                refusal = noteTranslationRefusal(error);
            }

            if (translations === null)
                results.push(...chunk.map(() => undefined));
            else {
                const chunkTranslations = translations;
                succeeded = true;
                results.push(
                    ...chunk.map((_, index) => chunkTranslations[index]),
                );
            }

            done += chunk.length;
            options?.progress?.({
                done,
                total: texts.length,
                kept: results.filter((result) => result === undefined).length,
            });

            // Being out of budget or signed out won't resolve itself between
            // chunks, so stop asking rather than spending the remaining
            // requests on the same refusal.
            if (refusal === 'over-budget' || refusal === 'unauthenticated') {
                results.push(
                    ...texts.slice(results.length).map(() => undefined),
                );
                break;
            }
        }

        return succeeded ? results : null;
    };
}
