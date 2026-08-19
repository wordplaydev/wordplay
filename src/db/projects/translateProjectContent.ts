import type Locale from '@locale/Locale';
import type LocaleText from '@locale/LocaleText';
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
import type WordplayNode from '@nodes/Node';
import Reference from '@nodes/Reference';
import type Source from '@nodes/Source';
import TextLiteral from '@nodes/TextLiteral';
import TextType from '@nodes/TextType';
import Token from '@nodes/Token';
import Translation from '@nodes/Translation';
import getPreferredSpaces from '@parser/getPreferredSpaces';
import { isName } from '@parser/Tokenizer';
import { toMarkup } from '@parser/toMarkup';
import type Project from '@db/projects/Project';
import { normalizeSoftBreaks, type RawTranslator } from '@db/translateMarkup';

// Re-exported so existing importers of this path keep working; the type now
// lives with the reusable markup-translation helpers.
export type { RawTranslator } from '@db/translateMarkup';

// Convert any camel cased word into space separated words.
const SeparateWords = /[A-Z-_](?=[a-z0-9]+)|[A-Z-_]+(?![a-z0-9])/g;

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

/**
 * Make a machine-translated name a valid Wordplay identifier. Transliterations
 * commonly carry an apostrophe (a Hebrew geresh, a glottal stop) that a translator
 * writes as an ASCII `'` or a curly `'`/`‘` — all of which are *string delimiters*
 * in Wordplay, so they'd open an unterminated text literal mid-identifier and break
 * tokenization. We swap them for the modifier letter apostrophe `ʼ` (U+02BC), a
 * letter that reads identically and is valid in a name. Returns the sanitized name,
 * or undefined if it still isn't a single valid name (some other reserved character
 * slipped in) — in which case the caller should keep the source name rather than
 * ship a broken identifier.
 */
export function sanitizeTranslatedName(name: string): string | undefined {
    const fixed = name.replace(/['‘’′]/gu, 'ʼ');
    return isName(fixed) ? fixed : undefined;
}

/**
 * Backend-agnostic core of project translation: given a project, source and
 * target locales, an injected raw translator, and the already-loaded target
 * locale text, translate the project's names, documentation, and text literals
 * (reusing any translations already present), update references to renamed
 * binds, and return the revised project — or `null` on failure. Decoupled from
 * Firebase and the Database store so both the in-app dialog and the CLI can
 * reuse it.
 */
export default async function translateProjectContent(
    project: Project,
    sourceLocale: Locale,
    targetLocale: Locale,
    translateTexts: RawTranslator,
    targetLocaleText: LocaleText | undefined,
    /** When true, REPLACE content with the target language (the program ends up
     *  written in the target language) instead of ADDING a target translation
     *  alongside the source. Used to localize embedded `\code\` examples so they
     *  read natively; the default (false) is the in-app "add a translation"
     *  behavior. References (including standard-library ones) are retargeted to
     *  the target locale's names in both modes. */
    replace = false,
): Promise<Project | null> {
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

                // Convert the camel cased name into separated words for better translation performance.
                const original = nameToTranslate
                    .getName()
                    ?.replace(SeparateWords, ' $&')
                    .trim();

                return {
                    names,
                    // The original text to translate, or undefined if there is
                    // no text to translate. A name with no letter in any script
                    // (an emoji or operator name like 🔈 or ≠) isn't
                    // translatable prose — sending it invites the model to
                    // invent a word for it, so it keeps its name instead. The
                    // locale verifier makes the same exclusion for symbolic
                    // basis names.
                    original:
                        original !== undefined && /\p{L}/u.test(original)
                            ? original
                            : undefined,
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
                              ? // Only plain text can be handed over and put
                                // back. A text literal's segments are not all
                                // tokens — an interpolation (`'hi \name\'`) is
                                // an expression, and a `@Concept` inside the
                                // text is a link node — and dropping them to
                                // read the text meant the translation written
                                // back *replaced* them. `'hello \name\'` came
                                // back as `'hello '`, which unbalances the
                                // example's delimiters and costs the caller the
                                // whole example; `'@U/192'` came back as `''`.
                                // Leaving such a literal untranslated costs one
                                // string of localization instead.
                                docToTranslate.segments.every(
                                    (t) => t instanceof Token,
                                )
                                  ? docToTranslate.segments
                                        .filter(
                                            (t): t is Token =>
                                                t instanceof Token,
                                        )
                                        .map((t) => t.toWordplay())
                                        .join('')
                                  : undefined
                              : docToTranslate.markup.paragraphs
                                    .map((p) =>
                                        normalizeSoftBreaks(p.toWordplay()),
                                    )
                                    .join('\n\n'),
                    translation: existingTranslation?.toWordplay(),
                };
            });

        // Get the original text with no translation to send to the translator.
        const originalTexts = [...bindsToTranslate, ...textToTranslate]
            .filter((bind) => bind.translation === undefined)
            .map((bind) => bind.original)
            .filter((text): text is string => text !== undefined);

        // Keep a record of the revised project to return.
        let newProject = project;

        /**
         * The node in `newProject` corresponding to one collected from `project`.
         *
         * Every pass below replaces nodes gathered before any replacement ran,
         * but replacing a node rebuilds all of its ancestors — so a `Docs` whose
         * embedded `\code\` example held a reference the retargeting pass
         * rewrote is no longer the object sitting in the tree. `getSourceOf`
         * then fails, `withRevisedNodes` logs and *skips* the replacement, and
         * the content is silently left untranslated; downstream, the example's
         * delimiters no longer match its source and the whole example is
         * discarded in favour of the English one. Structural paths survive that,
         * since replacing a node with one of the same shape leaves the path to
         * its container intact.
         */
        const current = (node: WordplayNode): WordplayNode => {
            const source = project.getSourceOf(node);
            if (source === undefined) return node;
            const resolved = newProject.resolvePath(
                project.getSources().indexOf(source),
                source.root.getPath(node),
            );
            // A path that resolves to a different kind of node isn't the same
            // node in a new tree; leaving the original alone is the safe miss.
            return resolved !== undefined &&
                resolved.getDescriptor() === node.getDescriptor()
                ? resolved
                : node;
        };

        // Build a map from each unique original text to its translation, so lookups don't depend on positional indexes (which break when originalTexts has duplicates).
        let translationByOriginal: Map<string, string> | null = null;
        // If there are more than one and the source and target are different, get some translations.
        if (
            originalTexts.length > 0 &&
            sourceLocale.language !== targetLanguage
        ) {
            // Remove duplicates from the original texts to minimize cost.
            const uniqueOriginals = Array.from(new Set(originalTexts));

            // Sample the project's names and docs as domain context for the
            // backend (bounded to keep the request small).
            const context = {
                names: bindsToTranslate
                    .map((b) => b.original)
                    .filter((n): n is string => n !== undefined)
                    .slice(0, 30),
                docs: textToTranslate
                    .map((t) => t.original)
                    .filter((d): d is string => d !== undefined)
                    .slice(0, 5),
            };

            const translations = await translateTexts(
                uniqueOriginals,
                sourceLocale,
                targetLocale,
                context,
            );

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
        if (targetLocaleText)
            newProject = newProject.withPrimaryLocale(targetLocaleText);

        // The text/doc pass runs BEFORE reference retargeting on purpose. It
        // rebuilds a doc from its translation, and that translation was made
        // from the source-language text — so any reference the retargeting
        // pass had already renamed inside the doc's embedded `\code\` would be
        // reverted, leaving the example naming a bind that no longer exists.
        // That reads as a new conflict, and the caller then throws the whole
        // localized example away. Retargeting after this pass fixes up the
        // references inside whatever text landed, since it collects from the
        // current project rather than the original.
        // Add the translated text to the project.
        newProject = newProject.withRevisedNodes(
            textToTranslate.map((textToTranslate) => {
                const { names: markups, original } = textToTranslate;
                const target = current(markups);
                let translation = textToTranslate.translation;

                // Already have a translation? No change.
                if (translationByOriginal === null || translation !== undefined)
                    return [target, target];

                if (original === undefined) return [target, target];
                const translated = translationByOriginal.get(original);
                if (translated === undefined) return [target, target];

                translation = translated;

                const [markup] = toMarkup(translation);

                // In replace mode the text becomes a single target-language
                // option (so the program reads natively); otherwise the target
                // is added as another option alongside the source.
                // Built from `target`, not `markups`: an earlier pass may have
                // rewritten a reference inside this doc's embedded example, and
                // rebuilding from the node collected beforehand would throw
                // that away.
                return [
                    target,
                    target instanceof TextLiteral
                        ? replace
                            ? TextLiteral.make(translation)
                            : target.withOption(
                                  Translation.make(
                                      translation,
                                      Language.make(targetLanguage),
                                  ),
                              )
                        : target instanceof Docs
                          ? replace
                              ? Docs.make([
                                    withFormattedMarkupSpaces(
                                        Doc.make(markup.paragraphs),
                                    ),
                                ])
                              : target.withOption(
                                    withFormattedMarkupSpaces(
                                        Doc.make(
                                            markup.paragraphs,
                                            Language.make(targetLanguage),
                                        ),
                                    ),
                                )
                          : replace
                            ? FormattedLiteral.make([
                                  withFormattedMarkupSpaces(
                                      FormattedTranslation.make(
                                          markup.paragraphs,
                                      ),
                                  ),
                              ])
                            : target instanceof FormattedLiteral
                              ? target.withOption(
                                    withFormattedMarkupSpaces(
                                        FormattedTranslation.make(
                                            markup.paragraphs,
                                            Language.make(targetLanguage),
                                        ),
                                    ),
                                )
                              : // A path that resolved to some other kind of
                                // node isn't this one; leave it be.
                                target,
                ];
            }),
        );

        // Revise the project to include the new translated names and updated references to those new names.
        // Compute the target-language name for each bind (camel-cased,
        // collision-free), keyed by its Names node. We resolve names up front so
        // references can be retargeted while the source name still resolves —
        // essential in replace mode, where the source name is then removed.
        const targetNameByNames = new Map<Names, string>();
        for (const bindToTranslate of bindsToTranslate) {
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
                if (translated === undefined) continue;
                // Convert the translated text into camel case, to conform to
                // Wordplay's naming rules. Split on spaces AND underscores (a
                // translator may snake_case a name; `_` is the reserved
                // placeholder symbol, never a valid name character), and drop
                // empties so leading/trailing separators don't add stray casing.
                translation = translated
                    .split(/[ _]+/u)
                    .filter((word) => word.length > 0)
                    .map((word, i) =>
                        i === 0
                            ? word.toLowerCase()
                            : word.charAt(0).toUpperCase() + word.slice(1),
                    )
                    .join('');
                // Don't ship a name that isn't a valid identifier (e.g. one a
                // transliteration left an apostrophe in); keep the source name.
                const sanitized = sanitizeTranslatedName(translation);
                if (sanitized === undefined) continue;
                translation = sanitized;
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

            if (translation !== undefined)
                targetNameByNames.set(names, translation);
        }

        // Retarget every reference to its definition's target-language name. For
        // creator binds we use the freshly-computed name (so this works before
        // the name change is applied); standard-library references fall back to
        // the definition's name in the target locale (present via the
        // withPrimaryLocale above).
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
                        targetNameByNames.get(definition.names) ??
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

        // Now apply the name change to each bind. In replace mode the bind
        // becomes a single target-language name (so the program reads natively);
        // otherwise the target name is added alongside the source.
        newProject = newProject.withRevisedNodes(
            bindsToTranslate.map(({ names }) => {
                const target = current(names);
                const translation = targetNameByNames.get(names);
                if (translation === undefined) return [target, target];
                return [
                    target,
                    replace
                        ? Names.make([translation])
                        : names.withName(translation, targetLanguage),
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
        console.error('translateProjectContent failed:', e);
        return null;
    }
}
