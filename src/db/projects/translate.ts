import { Locales } from '@db/Database';
import { GoogleTranslateCodeOverrides } from '@locale/LanguageCode';
import type Locale from '@locale/Locale';
import { localeToString } from '@locale/Locale';
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import Doc from '@nodes/Doc';
import Docs from '@nodes/Docs';
import Evaluate from '@nodes/Evaluate';
import FormattedLiteral from '@nodes/FormattedLiteral';
import FormattedTranslation from '@nodes/FormattedTranslation';
import Input from '@nodes/Input';
import Language from '@nodes/Language';
import Markup from '@nodes/Markup';
import Names from '@nodes/Names';
import Reference from '@nodes/Reference';
import type Source from '@nodes/Source';
import TextLiteral from '@nodes/TextLiteral';
import TextType from '@nodes/TextType';
import Token from '@nodes/Token';
import Translation from '@nodes/Translation';
import getPreferredSpaces from '@parser/getPreferredSpaces';
import { toMarkup } from '@parser/toMarkup';
import { httpsCallable, type Functions } from 'firebase/functions';
import type Project from '@db/projects/Project';

// Convert any camel cased word into space separated words.
const SeparateWords = /[A-Z-_](?=[a-z0-9]+)|[A-Z-_]+(?![a-z0-9])/g;

/** The code to hand to Google Translate for a locale. A few languages Google
 *  supports under a different code (e.g. `nb`→`no`); those use the override
 *  (no region, since the override is already the code Google expects). All
 *  others are sent as the full locale string, unchanged from before. */
function toGoogleTranslateCode(locale: Locale): string {
    return (
        GoogleTranslateCodeOverrides[locale.language] ?? localeToString(locale)
    );
}

/**
 * Doc.make() and FormattedTranslation.make() build their inner Markup with
 * no Spaces, but the stage renderer ([MarkupHTMLView](src/components/concepts/MarkupHTMLView.svelte))
 * falls back to "unable to render markup without spaces" when that field is
 * undefined. We reattach computed spaces here so the translated Doc /
 * FormattedTranslation render the same way the original source-parsed one
 * does. Same pattern as the source-level `getPreferredSpaces` call below.
 */
function withFormattedMarkupSpaces<T extends Doc | FormattedTranslation>(
    node: T,
): T {
    const inner = node.markup;
    return node.replace(
        inner,
        new Markup(inner.paragraphs, getPreferredSpaces(inner)),
    ) as T;
}

/** Given a reference to Firebase functions, a project, and a target language, translate the project's names, documentation, and text literals
 * using a combination of the text already in the project and translations from Google's Translate API. Subsequent calls the project should
 * use the previously translations to avoid unnecessary API calls.
 */
export default async function translateProject(
    functions: Functions,
    project: Project,
    sourceLocale: Locale,
    targetLocale: Locale,
) {
    const targetLanguage = targetLocale.language;

    try {
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
                        name.isLanguage(sourceLocale.language) ||
                        !name.hasLanguage(),
                );

                if (nameToTranslate === undefined) return undefined;

                // Get the name already in the target language, if there is one. Prefer full names, not symbolic names.
                const targetName = names
                    .getNameInLanguage(targetLanguage, false)
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

        // Find all the docs and text literals in the program needing translation.
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
            // Filter out values that are input to evaluate binds that are literal text types, since they won't permit arbritrary text.
            .filter((markup) => {
                if (markup instanceof TextLiteral) {
                    const root = project.getRoot(markup);
                    if (root) {
                        const evaluates = root
                            .getAncestors(markup)
                            .filter((node) => node instanceof Evaluate);
                        for (const evaluate of evaluates) {
                            const source = project.getSourceOf(evaluate);
                            if (source === undefined) continue;
                            const inputs = evaluate.getInputMapping(
                                project.getContext(source),
                            );
                            const input = inputs?.inputs.find(
                                (mapping) =>
                                    mapping.given === markup ||
                                    (mapping.given instanceof Input &&
                                        mapping.given.value === markup),
                            );
                            const types = input?.expected
                                .getType(project.getContext(source))
                                .getTypeSet(project.getContext(source))
                                .list();
                            if (
                                types !== undefined &&
                                types.some(
                                    (t) =>
                                        t instanceof TextType && t.isLiteral(),
                                )
                            )
                                return false;
                        }
                    }
                }
                return true;
            })
            .map((markups) => {
                const docToTranslate =
                    markups.getLanguage(sourceLocale.language) ??
                    markups.getOptions()[0];
                const existingTranslation = markups.getLanguage(targetLanguage);

                return {
                    names: markups,
                    original:
                        docToTranslate === undefined
                            ? undefined
                            : docToTranslate instanceof Translation
                              ? docToTranslate.segments
                                    .filter(
                                        (t): t is Token => t instanceof Token,
                                    )
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

        // Build a map from each unique original text to its translation, so lookups don't depend on positional indexes (which break when originalTexts has duplicates).
        let translationByOriginal: Map<string, string> | null = null;
        // If there are more than one and the source and target are different, get some translations.
        if (
            originalTexts.length > 0 &&
            sourceLocale.language !== targetLanguage
        ) {
            const getTranslations = httpsCallable<
                { from: string; to: string; text: string[] },
                string[] | null
            >(functions, 'getTranslations');

            // Remove duplicates from the original texts to minimize cost.
            const uniqueOriginals = Array.from(new Set(originalTexts));

            const translations = (
                await getTranslations({
                    from: toGoogleTranslateCode(sourceLocale),
                    to: toGoogleTranslateCode(targetLocale),
                    text: uniqueOriginals,
                })
            ).data;

            // If we didn't get any translations, return nothing as an indicator of failure.
            if (translations === null) return null;

            translationByOriginal = new Map();
            uniqueOriginals.forEach((original, index) => {
                const translated = translations[index];
                if (typeof translated === 'string')
                    translationByOriginal!.set(original, translated);
            });
        }

        // First, revise the project to contain the target locale, so we have names from the locale.
        const targetLocaleText = await Locales.loadLocale(
            localeToString(targetLocale),
            false,
        );
        if (targetLocaleText)
            newProject = newProject.withPrimaryLocale(targetLocaleText);

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
                    translationByOriginal
                ) {
                    const translated = translationByOriginal.get(original);
                    if (translated === undefined) return [names, names];
                    // Convert the translated text into camel case, to confirm to Wordplay's naming rules.
                    translation = translated
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
                if (translationByOriginal === null || translation !== undefined)
                    return [markups, markups];

                if (original === undefined) return [markups, markups];
                const translated = translationByOriginal.get(original);
                if (translated === undefined) return [markups, markups];

                translation = translated;

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
                                withFormattedMarkupSpaces(
                                    Doc.make(
                                        markup.paragraphs,
                                        Language.make(targetLanguage),
                                    ),
                                ),
                            )
                          : markups.withOption(
                                withFormattedMarkupSpaces(
                                    FormattedTranslation.make(
                                        markup.paragraphs,
                                        Language.make(targetLanguage),
                                    ),
                                ),
                            ),
                ];
            }),
        );

        // Tidy all sources
        newProject = newProject.withRevisedNodes(
            newProject.getSources().map((source) => {
                return [
                    source,
                    source.withSpaces(
                        getPreferredSpaces(source.root, source.spaces),
                    ),
                ];
            }),
        );

        // Return the revised project
        return newProject;
    } catch (e) {
        console.error('translateProject failed:', e);
        return null;
    }
}
