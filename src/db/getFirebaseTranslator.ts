import { localeToString } from '@locale/Locale';
import type { RawTranslator } from '@db/translateMarkup';
import type { Functions } from 'firebase/functions';
import type {
    GetLLMTranslationsInputs,
    GetLLMTranslationsOutput,
} from 'shared-types';

/**
 * Adapt the Firebase `getLLMTranslations` callable (Claude) into a backend-
 * agnostic [RawTranslator](src/db/translateMarkup.ts). Shared by project
 * translation and chat message translation so both hit the same callable with
 * the same request shape.
 */
export default function getFirebaseTranslator(
    functions: Functions,
): RawTranslator {
    return async (texts, from, to, context) => {
        const { httpsCallable } = await import('firebase/functions');
        const call = httpsCallable<
            GetLLMTranslationsInputs,
            GetLLMTranslationsOutput
        >(functions, 'getLLMTranslations');
        return (
            await call({
                from: localeToString(from),
                to: localeToString(to),
                texts,
                ...(context ? { projectContext: context } : {}),
            })
        ).data;
    };
}
