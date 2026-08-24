import { Locales } from '@db/Database';
import getFirebaseTranslator, {
    type TranslationProgress,
} from '@db/getFirebaseTranslator';
import type Project from '@db/projects/Project';
import type Locale from '@locale/Locale';
import { localeToString } from '@locale/Locale';
import type { Functions } from 'firebase/functions';
import translateProjectContent, {
    type TranslationPhase,
} from './translateProjectContent';

/** Given a reference to Firebase functions, a project, and a target language, translate the project's names, documentation, and text literals
 * using a combination of the text already in the project and translations from Claude. Subsequent calls on the project
 * reuse the previous translations to avoid unnecessary API calls. Delegates to the backend-agnostic
 * [translateProjectContent](src/db/projects/translateProjectContent.ts), injecting the shared
 * [Firebase translator](src/db/getFirebaseTranslator.ts) — which chunks, reports progress, and
 * carries the daily budget — and forwarding project context for quality.
 */
export default async function translateProject(
    functions: Functions,
    project: Project,
    sourceLocale: Locale,
    targetLocale: Locale,
    /** When true, rewrite the project in the target language instead of adding
     *  the target language alongside what the creator wrote. */
    rewrite: boolean,
    /** Called once, before anything is sent, with how many strings need
     *  translating — what a caller says is about to happen. */
    plan?: (strings: number) => void,
    /** Called as the work proceeds, so a caller can show something more useful
     *  than a spinner: the phases either side of the network, and the count of
     *  strings translated as each chunk lands. */
    report?: (
        update:
            | { kind: 'phase'; phase: TranslationPhase }
            | ({ kind: 'translating' } & TranslationProgress),
    ) => void,
): Promise<Project | null> {
    // Load the target locale text so the project gains that locale's names.
    const targetLocaleText = await Locales.loadLocale(
        localeToString(targetLocale),
        false,
    );

    return translateProjectContent(
        project,
        sourceLocale,
        targetLocale,
        getFirebaseTranslator(functions, {
            progress: (progress) =>
                report?.({ kind: 'translating', ...progress }),
        }),
        targetLocaleText ?? undefined,
        rewrite,
        {
            phase: (phase) => report?.({ kind: 'phase', phase }),
            plan: (strings) => plan?.(strings),
            // Never hand back a program the translation broke (#1276).
            validate: true,
        },
    );
}
