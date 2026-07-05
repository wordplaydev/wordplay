import { Locales } from '@db/Database';
import type Locale from '@locale/Locale';
import { localeToString } from '@locale/Locale';
import type { Functions } from 'firebase/functions';
import type {
    GetLLMTranslationsInputs,
    GetLLMTranslationsOutput,
} from 'shared-types';
import type Project from '@db/projects/Project';
import translateProjectContent from './translateProjectContent';

/** Given a reference to Firebase functions, a project, and a target language, translate the project's names, documentation, and text literals
 * using a combination of the text already in the project and translations from Claude. Subsequent calls on the project
 * reuse the previous translations to avoid unnecessary API calls. Delegates to the backend-agnostic
 * [translateProjectContent](src/db/projects/translateProjectContent.ts), injecting the Firebase
 * `getLLMTranslations` callable (Claude) as the raw translator and forwarding project context for quality.
 */
export default async function translateProject(
    functions: Functions,
    project: Project,
    sourceLocale: Locale,
    targetLocale: Locale,
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
        async (texts, from, to, context) => {
            const { httpsCallable } = await import('firebase/functions');
            const getLLMTranslations = httpsCallable<
                GetLLMTranslationsInputs,
                GetLLMTranslationsOutput
            >(functions, 'getLLMTranslations');
            return (
                await getLLMTranslations({
                    from: localeToString(from),
                    to: localeToString(to),
                    texts,
                    ...(context ? { projectContext: context } : {}),
                })
            ).data;
        },
        targetLocaleText ?? undefined,
    );
}
