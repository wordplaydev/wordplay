import type LanguageCode from '@locale/LanguageCode';
import type Project from './Project';
import { httpsCallable, type Functions } from 'firebase/functions';
import Reference from '@nodes/Reference';
import type Source from '@nodes/Source';
import Names from '@nodes/Names';
import { Locales } from '@db/Database';
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import Docs from '@nodes/Docs';
import Doc from '@nodes/Doc';
import { toMarkup } from '@parser/toMarkup';
import Language from '@nodes/Language';
import FormattedLiteral from '@nodes/FormattedLiteral';
import FormattedTranslation from '@nodes/FormattedTranslation';
import TextLiteral from '@nodes/TextLiteral';
import Translation from '@nodes/Translation';
import Token from '@nodes/Token';

// Convert any camel cased word into space separated words.
const SeparateWords = /[A-Z-_](?=[a-z0-9]+)|[A-Z-_]+(?![a-z0-9])/g;

/** Given a reference to Firebase functions, a project, and a target language, translate the project's names, documentation, and text literals
 * using a combination of the text already in the project and translations from Google's Translate API. Subsequent calls the project should
 * use the previously translations to avoid unnecessary API calls.
 */
export default async function translateProject(
    functions: Functions,
    project: Project,
    targetLocaleCode: string,
) {
    const targetLanguage = targetLocaleCode.split('-')[0] as LanguageCode;

    try {
        // Get the project's primary language.
        const sourceLanguage = project.getPrimaryLanguage();

        // Keep track of existing names in target language
        const existingNames = new Set<string>();

        // collect existing names in target language
        project.getSources().forEach((source) => {
            source
                .nodes()
                .filter((node): node is Names => node instanceof Names)
                .forEach((names) => {
                    const targetName = names
                        .getNameInLanguage(targetLanguage, undefined)
                        ?.getName();
                    if (targetName) existingNames.add(targetName);
                });
        });

        // Find all of the names binds in the project's sources. We're going to add translated names to them, and update references to those names, if necessary.
        // Convert the binds into a record of translations to perform.
        const bindsToTranslate = project
            .getSources()
            .reduce(
                (names: Names[], source) => [
                    ...names,
                    ...source
                        .nodes()
                        .filter((node): node is Names => node instanceof Names),
                ],
                [],
            )
            .map((names) => {
                // Is there a name in the source language or a name with no language? Use that as the source name.
                const nameToTranslate = names.names.find(
                    (name) =>
                        name.isLanguage(sourceLanguage) || !name.hasLanguage(),
                );

                if (nameToTranslate === undefined) return undefined;

                // Get the name already in the target language, if there is one.
                const targetName = names
                    .getNameInLanguage(targetLanguage, undefined)
                    ?.getName();

                return {
                    names,
                    // The original text to translate, or undefined if there is no text to translate.
                    // Convert the camel cased name into separated words for better translation performance.
                    original: nameToTranslate
                        .getName()
                        ?.replace(SeparateWords, ' $&')
                        .trim(),
                    // The translation, or undefined if there is no translation yet.
                    translation: targetName,
                };
            })
            // Skip any names that don't need a translation.
            .filter(
                (
                    text,
                ): text is {
                    names: Names;
                    original: string;
                    translation: string | undefined;
                } => text !== undefined,
            );

        // Find all the docs in the program needing translation.
        const textToTranslate = project
            .getSources()
            .reduce(
                (
                    markups: (Docs | FormattedLiteral | TextLiteral)[],
                    source,
                ) => [
                    ...markups,
                    ...source
                        .nodes()
                        .filter(
                            (
                                node,
                            ): node is Docs | FormattedLiteral | TextLiteral =>
                                node instanceof Docs ||
                                node instanceof FormattedLiteral ||
                                node instanceof TextLiteral,
                        ),
                ],
                [],
            )
            .map((markups) => {
                const docToTranslate =
                    markups.getLanguage(sourceLanguage) ??
                    markups.getOptions()[0];
                const existingTranslation = markups.getLanguage(targetLanguage);

                return {
                    names: markups,
                    original:
                        docToTranslate instanceof Translation
                            ? docToTranslate.segments
                                  .filter((t): t is Token => t instanceof Token)
                                  .map((t) => t.toWordplay())
                                  .join('')
                            : docToTranslate.markup.paragraphs
                                  .map((p) => p.toWordplay())
                                  .join('\n\n'),
                    translation: existingTranslation?.toWordplay(),
                };
            });

        // Get the original text with no translation to send to the Google Translate API via our Firebase cloud function.
        const originalTexts = [...bindsToTranslate, ...textToTranslate]
            .filter((bind) => bind.translation === undefined)
            .map((bind) => bind.original)
            .filter((text): text is string => text !== undefined);

        // Keep a record of the revised project to return.
        let newProject = project;

        // If there are original texts to translate, get the translations from the API.
        let translations: string[] | null = null;
        // If there are more than one and the source and target are different, get some translations.
        if (originalTexts.length > 0 && sourceLanguage !== targetLanguage) {
            const getTranslations = httpsCallable<
                {
                    from: string;
                    to: string;
                    text: string[];
                },
                string[] | null
            >(functions, 'getTranslations');

            translations = (
                await getTranslations({
                    from: sourceLanguage,
                    to: targetLanguage,
                    // Remove duplicates from the original texts to minimize cost.
                    text: Array.from(new Set(originalTexts)),
                })
            ).data;

            // If we didn't get any translations, return nothing as an indicator of failure.
            if (translations === null) return null;
        }

        // First, revise the project to contain the target locale, so we have names from the locale.
        const targetLocale = await Locales.loadLocale(targetLocaleCode, false);
        if (targetLocale)
            newProject = newProject.withPrimaryLocale(targetLocale);

        // Revise the project to include the new translated names and updated references to those new names.
        newProject = newProject.withRevisedNodes(
            bindsToTranslate.map((bindToTranslate) => {
                const { names, original } = bindToTranslate;
                // If we already have a translation, use it.
                let translation = bindToTranslate.translation;
                // If we don't, and there was an original text, and we have some translations, then use the translation.
                if (
                    translation === undefined &&
                    original !== undefined &&
                    translations
                ) {
                    const originalIndex = originalTexts.indexOf(original);
                    if (originalIndex === -1) return [names, names];
                    // Convert the translated text into camel case, to confirm to Wordplay's naming rules.
                    translation = translations[originalIndex]
                        .split(' ')
                        .map((word, i) =>
                            i === 0
                                ? word.toLowerCase()
                                : word.charAt(0).toUpperCase() + word.slice(1),
                        )
                        .join('');
                    if (existingNames.has(translation)) {
                        let counter = 2;
                        // Increment the counter until a unique name is found
                        while (existingNames.has(`${translation}${counter}`)) {
                            counter++;
                        }
                        translation = `${translation}${counter}`;
                    }

                    //Add the unique translation to the set
                    existingNames.add(translation);
                }

                // If we have a translation, add it to the bind and update its references.
                if (translation !== undefined) {
                    // Return the updated bind and the updated references.
                    return [names, names.withName(translation, targetLanguage)];
                } else return [names, names];
            }),
        );

        // Now that the revised projects as all of the translations required, revise all references in the project to use the name in the target language, when available.
        newProject = newProject.withRevisedNodes(
            newProject
                .getSources()
                .reduce(
                    (
                        references: { reference: Reference; source: Source }[],
                        source,
                    ) => [
                        ...references,
                        ...source
                            .nodes()
                            .filter(
                                (node): node is Reference =>
                                    node instanceof Reference,
                            )
                            .map((reference) => ({ reference, source })),
                    ],
                    [],
                )
                .map(({ reference, source }) => {
                    const definition = reference.resolve(
                        newProject.getContext(source),
                    );

                    // Find the references to this bind so we can replace them with the new name
                    if (definition === undefined) return [reference, reference];

                    // Get the name in the target language.
                    const parent = newProject
                        .getRoot(reference)
                        ?.getParent(reference);
                    const infix =
                        parent instanceof BinaryEvaluate &&
                        parent.fun === reference
                            ? true
                            : undefined;
                    const translation =
                        definition.names
                            .getNameInLanguage(targetLanguage, infix)
                            ?.getName() ??
                        definition.names.names
                            .find((name) => !name.hasLanguage())
                            ?.getName();

                    if (
                        translation === undefined ||
                        reference.getName() === translation
                    )
                        return [reference, reference];

                    return [reference, Reference.make(translation)];
                }),
        );

        // Add the translated text to the project.
        newProject = newProject.withRevisedNodes(
            textToTranslate.map((textToTranslate) => {
                const { names: markups, original } = textToTranslate;
                let translation = textToTranslate.translation;

                // Already have a translation? No change.
                if (translations === null || translation !== undefined)
                    return [markups, markups];

                const originalIndex = originalTexts.indexOf(original);
                if (originalIndex === -1) return [markups, markups];

                translation = translations[originalIndex];

                const [markup] = toMarkup(translation);

                return [
                    markups,
                    markups instanceof TextLiteral
                        ? markups.withOption(
                              Translation.make(
                                  translation,
                                  Language.make(targetLanguage),
                              ),
                          )
                        : markups instanceof Docs
                          ? markups.withOption(
                                Doc.make(
                                    markup.paragraphs,
                                    Language.make(targetLanguage),
                                ),
                            )
                          : markups.withOption(
                                FormattedTranslation.make(
                                    markup.paragraphs,
                                    Language.make(targetLanguage),
                                ),
                            ),
                ];
            }),
        );

        // Return the revised project
        return newProject;
    } catch (e) {
        return null;
    }
}
