import chooseTranslator, {
    type TranslationBackend,
} from '@db/chooseTranslator';
import getFirebaseTranslator from '@db/getFirebaseTranslator';
import getLocalTranslator from '@db/getLocalTranslator';
import type { RawTranslator, TranslationProgress } from '@db/translateMarkup';
import type Locale from '@locale/Locale';
import type { Functions } from 'firebase/functions';

/**
 * The translator a page should use: the browser's own where it can, ours
 * otherwise. The only place that knows both backends exist.
 *
 * Preferring the device is not only cheaper. Nothing leaves the machine, so a
 * classroom conversation stays in the classroom, and a creator's daily
 * translation budget — which exists to keep the paid endpoint from being a
 * Denial-of-Wallet target, not to ration a feature — is spent only when we
 * actually do the work. That is what makes the meter an honest signal: if it
 * moves, we translated; if it doesn't, the browser did.
 */
export default function getPreferredTranslator(
    functions: Functions,
    options?: {
        onBackend?: (
            backend: TranslationBackend,
            from: Locale,
            to: Locale,
        ) => void;
        progress?: (progress: TranslationProgress) => void;
        allowDownload?: boolean;
        download?: (loaded: number) => void;
    },
): RawTranslator {
    // Progress goes to whichever backend is running. A batch is one or the
    // other, never both, so the two never interleave and `done` never goes
    // backwards.
    return chooseTranslator(
        getLocalTranslator(options),
        getFirebaseTranslator(functions, options),
        options?.onBackend,
    );
}
