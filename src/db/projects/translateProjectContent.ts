import type Locale from '@locale/Locale';
import type LanguageCode from '@locale/LanguageCode';
import type LocaleText from '@locale/LocaleText';
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import UnaryEvaluate from '@nodes/UnaryEvaluate';
import Doc from '@nodes/Doc';
import Docs from '@nodes/Docs';
import Evaluate from '@nodes/Evaluate';
import FormattedLiteral from '@nodes/FormattedLiteral';
import FormattedTranslation from '@nodes/FormattedTranslation';
import Input from '@nodes/Input';
import Language from '@nodes/Language';
import Markup from '@nodes/Markup';
import Name from '@nodes/Name';
import Names from '@nodes/Names';
import NameType from '@nodes/NameType';
import type WordplayNode from '@nodes/Node';
import Reference from '@nodes/Reference';
import Sym from '@nodes/Sym';
import type Definition from '@nodes/Definition';
import type Source from '@nodes/Source';
import TextLiteral from '@nodes/TextLiteral';
import Token from '@nodes/Token';
import Translation from '@nodes/Translation';
import getPreferredSpaces from '@parser/getPreferredSpaces';
import { getShadowingKeywordWords } from '@parser/Keywords';
import { isName } from '@parser/Tokenizer';
import { toMarkup } from '@parser/toMarkup';
import type Project from '@db/projects/Project';
import { normalizeSoftBreaks, type RawTranslator } from '@db/translateMarkup';
import {
    getComparedTextValues,
    shouldTranslateText,
} from '@db/projects/translatableText';
import { canonicalizeKeyName, localizeKeyName } from '@input/Key/Key';
import { WellKnownKeys } from '@input/Key/KeyboardKeys';
import { translationProblem } from '@db/projects/translationGuards';

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
 * A copy of this text node carrying only its option in `language`, with that
 * option's language tag and separator removed — what rewrite mode means for
 * content that was already multilingual.
 *
 * Each option is rebuilt from its own parts rather than through `make`, which
 * wraps content in a `Markup` with no `Spaces` (the thing
 * {@link withFormattedMarkupSpaces} exists to work around). Reusing the
 * existing `markup` keeps its spacing; for a `TextLiteral` it also keeps
 * segments that aren't plain text — an interpolation or a `@Concept` link —
 * which flattening to a string would destroy. The separator goes because these
 * containers, unlike `Names`, don't add or remove them, so an option that used
 * to sit between two others would print a stray one.
 *
 * Returns the node unchanged if it has no option in that language.
 */
function withOnlyLanguage<T extends WordplayNode>(
    node: T,
    language: LanguageCode,
): T | Docs | TextLiteral | FormattedLiteral {
    if (node instanceof Docs) {
        const doc = node.getLanguage(language);
        return doc === undefined
            ? node
            : Docs.make([new Doc(doc.open, doc.markup, doc.close)]);
    }
    if (node instanceof TextLiteral) {
        const text = node.getLanguage(language);
        return text === undefined
            ? node
            : new TextLiteral([
                  new Translation(text.open, text.segments, text.close),
              ]);
    }
    if (node instanceof FormattedLiteral) {
        const formatted = node.getLanguage(language);
        return formatted === undefined
            ? node
            : FormattedLiteral.make([
                  new FormattedTranslation(
                      formatted.open,
                      formatted.markup,
                      formatted.close,
                      undefined,
                      undefined,
                  ),
              ]);
    }
    return node;
}

/**
 * A copy of this text node with its untagged option's content replaced by the
 * translation, and every language-tagged option kept byte-identical — what
 * rewrite mode means under `preserveTagged`, where a tag marks content that
 * must survive translation (a French word in a French-teaching example).
 *
 * The fresh option comes from `make` for its delimiters and markup, but the
 * original's separator is kept so an option that sat between two others still
 * prints its own. Returns the node unchanged if no untagged option exists.
 */
function withReplacedUntaggedOption(
    node: Docs | TextLiteral | FormattedLiteral,
    translation: string,
    markup: Markup,
): Docs | TextLiteral | FormattedLiteral {
    if (node instanceof TextLiteral) {
        const index = node.texts.findIndex(
            (text) => text.getLanguage() === undefined,
        );
        if (index < 0) return node;
        const fresh = Translation.make(translation);
        return new TextLiteral(
            node.texts.map((text, i) =>
                i === index
                    ? new Translation(
                          fresh.open,
                          fresh.segments,
                          fresh.close,
                          undefined,
                          text.separator,
                      )
                    : text,
            ),
        );
    }
    if (node instanceof Docs) {
        const index = node.docs.findIndex(
            (doc) => doc.getLanguage() === undefined,
        );
        if (index < 0) return node;
        const fresh = withFormattedMarkupSpaces(Doc.make(markup.paragraphs));
        return new Docs(
            node.docs.map((doc, i) =>
                i === index
                    ? new Doc(
                          fresh.open,
                          fresh.markup,
                          fresh.close,
                          undefined,
                          doc.separator,
                      )
                    : doc,
            ),
        );
    }
    const index = node.texts.findIndex(
        (text) => text.getLanguage() === undefined,
    );
    if (index < 0) return node;
    const fresh = withFormattedMarkupSpaces(
        FormattedTranslation.make(markup.paragraphs),
    );
    return new FormattedLiteral(
        node.texts.map((text, i) =>
            i === index
                ? new FormattedTranslation(
                      fresh.open,
                      fresh.markup,
                      fresh.close,
                      undefined,
                      text.separator,
                  )
                : text,
        ),
    );
}

/**
 * A copy of these names with the untagged name(s) replaced by the translation
 * and every language-tagged name kept — rewrite mode under `preserveTagged`.
 * The `Names` constructor gives every non-final name a separator, but a name
 * that used to sit mid-list carries one it must lose if it lands last, or the
 * list serializes with a trailing comma that truncates on reparse.
 */
function withReplacedUntaggedNames(names: Names, translation: string): Names {
    const tagged = names.names.filter((name) => name.hasLanguage());
    return new Names(
        [Name.make(translation), ...tagged].map((name, index, list) =>
            index === list.length - 1 && name.separator !== undefined
                ? new Name(name.name, name.language, undefined)
                : name,
        ),
    );
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

/** Where translation has got to, for a caller showing progress. */
export type TranslationPhase = 'analyzing' | 'revising';

/** How many conflicts a project has, for comparing a translation against its
 *  source. */
function countConflicts(project: Project): number {
    return Array.from(project.analyze().conflictedNodes.values()).flat().length;
}

/**
 * A copy of these names with the translated one added in the target language.
 *
 * Deliberately not `Names.withName`, which replaces an *untagged* name when the
 * target language isn't present yet. That is reasonable for renaming, and
 * destructive here: a bind written `zombieCount: 8` has one untagged name, so
 * adding a translation deleted the name the creator wrote, and every reference
 * to it broke. It went unnoticed because reference retargeting rewrote those
 * references to the new name — the program still ran, in a language the creator
 * hadn't asked for, with their own words gone.
 *
 * An untagged name binds in every language, so appending leaves both usable.
 */
function withAddedName(
    names: Names,
    translation: string,
    language: LanguageCode,
): Names {
    // A name already in the target language is a translation to update, not a
    // second one to add.
    return names.names.some((name) => name.getLanguage() === language)
        ? names.withName(translation, language)
        : new Names([
              ...names.names,
              Name.make(translation, Language.make(language)),
          ]);
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
    /** Optional behavior for the in-app path. Defaults keep this function
     *  exactly as it was for the locale CLI, whose example-localization passes
     *  depend on it. */
    options?: {
        /** Called as the work moves between phases, for a caller showing
         *  progress. The translating phase in between is reported by the
         *  translator itself, which is the only thing that knows about chunks. */
        phase?: (phase: TranslationPhase) => void;
        /** Called once the work is known, before anything is sent, with how
         *  many strings need translating. Callers use it to say what is about
         *  to happen; nothing is sent when the count is zero. */
        plan?: (strings: number) => void;
        /** Refuse a translation that introduces conflicts the project didn't
         *  have. Off by default: it costs two whole-project analyses, which the
         *  CLI's several-hundred-example path shouldn't pay. */
        validate?: boolean;
        /** Treat explicitly language-tagged text and names as content rather
         *  than translations: never send them for translation, never collapse
         *  them in rewrite mode, and never respell a reference that
         *  deliberately uses a tagged name. Only untagged text translates. Off
         *  by default — rewriting a creator's own bilingual project SHOULD
         *  collapse to one language; a gallery example's tags mark pedagogical
         *  content (a French word in a French-teaching example) that must ship
         *  verbatim in every locale (#1310). */
        preserveTagged?: boolean;
        /** Called with why this returned null, when it does. Three quite
         *  different failures shared one message at the call sites, so a
         *  refused file said nothing about which had happened (#1310). */
        report?: (reason: string) => void;
    },
): Promise<Project | null> {
    const targetLanguage = targetLocale.language;
    const preserveTagged = options?.preserveTagged === true;

    try {
        options?.phase?.('analyzing');
        // One walk for the values the program compares against, shared by the
        // text filter below.
        const comparedValues = getComparedTextValues(project);
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
                    // Preserved tagged names in ANY language stay in the
                    // program, so a translation that lands on one of them is a
                    // duplicate name inside its own bind — which `validate`
                    // would then refuse, costing the whole file. Reserving them
                    // up front costs at most a numeric suffix.
                    if (preserveTagged)
                        for (const name of names.names)
                            if (name.hasLanguage()) {
                                const tagged = name.getName();
                                if (tagged) existingNames.add(tagged);
                            }
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
                // Is there a name in the source language or a name with no
                // language? Use that as the source name. Under `preserveTagged`
                // a source-language tag marks content, so only an untagged name
                // is translatable.
                const nameToTranslate = names.names.find((name) =>
                    preserveTagged
                        ? !name.hasLanguage()
                        : name.isLanguage(sourceLocale.language) ||
                          !name.hasLanguage(),
                );

                if (nameToTranslate === undefined) return undefined;

                // Get the name already in the target language, if there is one. Prefer full names, not symbolic names.
                const targetName = names
                    .getNameInLanguage(targetLanguage, false)
                    ?.getName();

                // Under `preserveTagged`, a tagged target-language name means
                // the definition is already named in the target language:
                // renaming the untagged name to it would duplicate it, and
                // translating the untagged name separately would invent a
                // second word. References still find the tagged name through
                // the retargeting fallback.
                if (preserveTagged && targetName !== undefined)
                    return undefined;

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
            // Leave alone the text that is data rather than prose — a key
            // name a program compares against, a map key, an emoji, and any
            // literal spelling a value the program compares against
            // *somewhere* (WhatWord's `"playing"` status). See
            // [translatableText](src/db/projects/translatableText.ts).
            .filter((markup) =>
                shouldTranslateText(markup, project, comparedValues),
            )
            .map((markups) => {
                // Under `preserveTagged`, a tagged option is content and only
                // the untagged option is the translatable text; without the
                // flag, the source-language option (or the first) is.
                const docToTranslate = preserveTagged
                    ? markups
                          .getOptions()
                          .find((option) => option.getLanguage() === undefined)
                    : (markups.getLanguage(sourceLocale.language) ??
                      markups.getOptions()[0]);
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

        // Key-name literals are mapped, never translated: the Key stream
        // reports a well-known key as the PRIMARY locale's display name
        // (localizeKeyName), so a program comparing `key = "Space"` only works
        // while its primary locale calls the space bar "Space". A rewrite into
        // es-MX must say "Espacio" — the exact string the stream will report
        // there — and the mapping is the stream's own table, so it is
        // deterministic and costs nothing. Only literals in data positions
        // (the ones shouldTranslateText protects) qualify: "Space" in prose is
        // a word like any other and translates normally.
        const keyLiteralsToLocalize: [TextLiteral, string][] = [];
        if (replace && targetLocaleText !== undefined) {
            const knownKeys = new Set<string>(WellKnownKeys);
            const sourceLocales = project.getLocales();
            const targetLocales = project
                .withPrimaryLocale(targetLocaleText)
                .getLocales();
            for (const source of project.getSources())
                for (const node of source.nodes())
                    if (
                        node instanceof TextLiteral &&
                        !shouldTranslateText(node, project, comparedValues)
                    ) {
                        const option = node.texts.find(
                            (text) => text.getLanguage() === undefined,
                        );
                        if (
                            option === undefined ||
                            !option.segments.every(
                                (segment) => segment instanceof Token,
                            )
                        )
                            continue;
                        const text = option.getText();
                        // Letters required: the bare `' '` literal is usually
                        // a join separator, not the space key.
                        if (!/\p{L}/u.test(text)) continue;
                        const canonical = canonicalizeKeyName(
                            text,
                            sourceLocales,
                        );
                        if (!knownKeys.has(canonical)) continue;
                        const localized = localizeKeyName(
                            canonical,
                            targetLocales,
                        );
                        if (localized !== text && localized.length > 0)
                            keyLiteralsToLocalize.push([node, localized]);
                    }
        }

        // Get the original text with no translation to send to the translator.
        const originalTexts = [...bindsToTranslate, ...textToTranslate]
            .filter((bind) => bind.translation === undefined)
            .map((bind) => bind.original)
            .filter((text): text is string => text !== undefined);

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

            options?.plan?.(uniqueOriginals.length);

            const translations = await translateTexts(
                uniqueOriginals,
                sourceLocale,
                targetLocale,
                context,
            );

            // If we didn't get any translations, return nothing as an indicator of failure.
            if (translations === null) {
                options?.report?.('the translation backend returned nothing');
                return null;
            }

            translationByOriginal = new Map();
            uniqueOriginals.forEach((original, index) => {
                const translated = translations[index];
                if (typeof translated === 'string')
                    translationByOriginal!.set(original, translated);
            });
        }

        // Revise the project to include the new translated names and updated references to those new names.
        // Names the target locale's own basis binds. A translated name that
        // matches one of these duplicates a definition the locale brings into
        // scope — the model rendering `speed` as the same word Chinese uses for
        // `Velocity` was enough to conflict the whole program — and the
        // project's own names can't see that, since the basis isn't in its
        // source.
        if (targetLocaleText)
            for (const root of project
                .withPrimaryLocale(targetLocaleText)
                .basis.getRoots())
                for (const node of root.root.nodes())
                    if (node instanceof Names)
                        for (const name of node.getNames())
                            existingNames.add(name);

        // Words the target locale (and every locale the project declares)
        // uses for a keyword. A name that lands on one stops being a name:
        // `withKeywordedSources()` below re-lexes the source, and a bind
        // named with the word for `true` re-parses as the literal ⊤ — which
        // is what made every locale whose word for "correct" is its word for
        // "true" ship a game that scored every guess. Reserving them here
        // routes such a name through the same numeric disambiguation that
        // already produces `números2`.
        for (const word of getShadowingKeywordWords([
            targetLocaleText?.keyword,
            ...project
                .getLocales()
                .getLocales()
                .map((l) => l.keyword),
        ]))
            existingNames.add(word);

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

        /**
         * The name a reference to this definition should take in the target
         * language, or undefined to leave the reference alone.
         *
         * `symbolic` is false everywhere except an infix operator position,
         * which wants the operator. Passing `undefined` — "any name in that
         * language" — is what turned `Phrase(...)` into `💬(...)`, because
         * fr-FR lists the emoji first. And when the locale has no suitable name
         * we keep what the creator wrote rather than falling through to an
         * untagged one: basis names are always language-tagged, so that
         * fallback could only ever reach a name from elsewhere in their own
         * project.
         */
        const targetName = (
            definition: Definition,
            symbolic: boolean | undefined,
        ): string | undefined =>
            targetNameByNames.get(definition.names) ??
            definition.names
                .getNameInLanguage(targetLanguage, symbolic ?? false)
                ?.getName();

        /**
         * Under `preserveTagged`, a reference deliberately spelled with one of
         * its definition's tagged names is content — a French-teaching example
         * calling a bind by its French name — and those names survive the
         * rewrite, so the reference keeps resolving. Respelling it would undo
         * the author's choice in every locale.
         *
         * Only for definitions the project's own sources declare: a basis
         * definition's names are ALL language-tagged, so applying this to them
         * silently disabled every standard-library rename. The `sourced`
         * predicate comes from the caller because the definitions here are
         * resolved in the revised project, which this closure can't see.
         */
        const spellsPreservedName = (
            definition: Definition,
            spelling: string,
            sourced: boolean,
        ): boolean =>
            preserveTagged &&
            sourced &&
            definition.names.names.some(
                (name) => name.hasLanguage() && name.getName() === spelling,
            );

        /** Assemble the revised project from the translations gathered above. */
        const build = (): Project => {
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

                    // Content already in the target language needs no
                    // translating, but in rewrite mode it still needs reducing:
                    // the point of rewriting is that one language is left, and
                    // treating "already translated" as "nothing to do" is why a
                    // project with English and French docs kept both while its
                    // binds correctly collapsed to their French names. Under
                    // `preserveTagged` the tagged option IS the translation and
                    // reducing is exactly what must not happen.
                    if (translation !== undefined)
                        return [
                            target,
                            replace && !preserveTagged
                                ? withOnlyLanguage(target, targetLanguage)
                                : target,
                        ];

                    // Nothing was translated at all — source and target are the
                    // same language, or every string already had its
                    // target-language version and was handled just above.
                    if (translationByOriginal === null) return [target, target];

                    if (original === undefined) return [target, target];
                    const translated = translationByOriginal.get(original);
                    if (translated === undefined) return [target, target];

                    // A translation that unbalances a delimiter or leaves a text
                    // literal open breaks the program around it, so keep the
                    // source: one string's localization is the cheaper loss.
                    // Same guarantee the locale tooling makes for examples.
                    const problem = translationProblem(original, translated);
                    if (problem !== undefined) {
                        console.warn(
                            `Keeping the original text: its translation left ${problem === 'delimiter' ? 'an unbalanced delimiter' : 'an unterminated text literal'}.`,
                        );
                        return [target, target];
                    }

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
                                ? preserveTagged
                                    ? withReplacedUntaggedOption(
                                          target,
                                          translation,
                                          markup,
                                      )
                                    : TextLiteral.make(translation)
                                : target.withOption(
                                      Translation.make(
                                          translation,
                                          Language.make(targetLanguage),
                                      ),
                                  )
                            : target instanceof Docs
                              ? replace
                                  ? preserveTagged
                                      ? withReplacedUntaggedOption(
                                            target,
                                            translation,
                                            markup,
                                        )
                                      : Docs.make([
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
                                ? target instanceof FormattedLiteral &&
                                  preserveTagged
                                    ? withReplacedUntaggedOption(
                                          target,
                                          translation,
                                          markup,
                                      )
                                    : FormattedLiteral.make([
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

            // Map key-name literals to the target locale's display names (see
            // the gather above): the string the Key stream will actually
            // report in the target-primary project.
            newProject = newProject.withRevisedNodes(
                keyLiteralsToLocalize.map(([literal, localized]) => {
                    const target = current(literal);
                    return [
                        target,
                        target instanceof TextLiteral
                            ? withReplacedUntaggedOption(
                                  target,
                                  localized,
                                  toMarkup(localized)[0],
                              )
                            : target,
                    ];
                }),
            );

            // Retarget every reference to its definition's target-language name,
            // and every type annotation with it.
            //
            // Only in replace mode. Adding a translation must not rewrite the
            // program: the creator asked for their words in another language,
            // not for their code to be restated in it. Nothing needs the
            // rewrite either — every project's basis appends the en-US
            // fallback, so `Stage(...)` keeps resolving in a French project,
            // and a creator bind keeps its source name alongside the added one.
            // Rewriting anyway also left the program half-translated, since
            // `Input` names are tokens rather than references (see the pass
            // below, which only runs here).
            if (replace) {
                // Named inputs — the `size:` in `Phrase(… size: 3m)` — name
                // their bind too, but an Input's name is a bare token rather
                // than a Reference, so no other pass reaches it. Left behind, a
                // rewritten program reads `Séquence.rebond(duration: 2s)`: the
                // function in one language and its inputs in another, which is
                // neither language.
                //
                // This pass runs BEFORE reference retargeting on purpose:
                // resolving an input's bind goes through the evaluation's
                // function, and a creator-defined structure's reference is
                // renamed by the pass below while its definition is only
                // renamed at the end — in between, `Room(take: …)` spelled
                // `xroom(take: …)` resolves nothing, every input on it was
                // skipped, and the renamed binds left `UnknownInput`s behind
                // (Adventure was full of them). Basis functions never showed
                // this, because the target locale's basis already declares the
                // new name.
                newProject = newProject.withRevisedNodes(
                    newProject
                        .getSources()
                        .reduce(
                            (
                                inputs: { input: Input; source: Source }[],
                                source,
                            ) => [
                                ...inputs,
                                ...source
                                    .nodes()
                                    .filter(
                                        (node): node is Input =>
                                            node instanceof Input,
                                    )
                                    .map((input) => ({ input, source })),
                            ],
                            [],
                        )
                        // Outermost first. An input's value can hold another
                        // evaluation with inputs of its own — `resting:
                        // Sequence.bounce(duration: 2s)` — and replacing the
                        // inner one rebuilds its ancestors, which leaves the
                        // outer node in this batch pointing at a tree that no
                        // longer contains it, so its replacement is silently
                        // dropped. Replacing the outer one first reuses the
                        // inner nodes by reference, so both land.
                        .sort(
                            (a, b) =>
                                (newProject
                                    .getRoot(a.input)
                                    ?.getAncestors(a.input).length ?? 0) -
                                (newProject
                                    .getRoot(b.input)
                                    ?.getAncestors(b.input).length ?? 0),
                        )
                        .map(({ input, source }) => {
                            const evaluate = newProject
                                .getRoot(input)
                                ?.getParent(input);
                            if (!(evaluate instanceof Evaluate))
                                return [input, input];
                            const bind = evaluate
                                .getInputMapping(newProject.getContext(source))
                                ?.inputs.find(
                                    (mapping) => mapping.given === input,
                                )?.expected;
                            if (bind === undefined) return [input, input];
                            if (
                                spellsPreservedName(
                                    bind,
                                    input.name.getText(),
                                    newProject.getSourceOf(bind) !== undefined,
                                )
                            )
                                return [input, input];
                            const translation = targetName(bind, false);
                            if (
                                translation === undefined ||
                                input.name.getText() === translation
                            )
                                return [input, input];
                            return [
                                input,
                                new Input(
                                    new Token(translation, Sym.Name),
                                    input.bind,
                                    input.value,
                                    input.separator,
                                ),
                            ];
                        }),
                );

                // For creator binds we use the freshly-computed name (so this works
                // before the name change is applied); standard-library references
                // fall back to the definition's name in the target locale (present
                // via the withPrimaryLocale above).
                newProject = newProject.withRevisedNodes(
                    newProject
                        .getSources()
                        .reduce(
                            (
                                references: {
                                    reference: Reference;
                                    source: Source;
                                }[],
                                source,
                            ) => [
                                ...references,
                                ...source
                                    .nodes()
                                    .filter(
                                        (node): node is Reference =>
                                            node instanceof Reference,
                                    )
                                    .map((reference) => ({
                                        reference,
                                        source,
                                    })),
                            ],
                            [],
                        )
                        .map(({ reference, source }) => {
                            const definition = reference.resolve(
                                newProject.getContext(source),
                            );

                            // Find the references to this bind so we can replace them with the new name
                            if (definition === undefined)
                                return [reference, reference];

                            if (
                                spellsPreservedName(
                                    definition,
                                    reference.getName(),
                                    newProject.getSourceOf(definition) !==
                                        undefined,
                                )
                            )
                                return [reference, reference];

                            // Get the name in the target language. An operator
                            // position — binary or unary — wants the symbolic
                            // name: a unary rewritten to a word glues onto its
                            // operand with no space (`~cellHolds` became
                            // `nocellHolds`, one name token that resolves
                            // nothing), which refused every file that used `~`.
                            const parent = newProject
                                .getRoot(reference)
                                ?.getParent(reference);
                            const operator =
                                (parent instanceof BinaryEvaluate ||
                                    parent instanceof UnaryEvaluate) &&
                                parent.fun === reference
                                    ? true
                                    : undefined;
                            const translation = targetName(
                                definition,
                                operator,
                            );

                            if (
                                translation === undefined ||
                                reference.getName() === translation
                            )
                                return [reference, reference];

                            // Never respell a reference into something that
                            // means something else here. The locale's word for
                            // a basis definition can be the very word an
                            // enclosing bind already uses — ja-JP calls `Time`
                            // 時間, and `time/en,時間/zh: Time(…)` carries that
                            // name itself — so the rewritten reference resolves
                            // to the bind and the bind references itself. The
                            // reverse direction is guarded by seeding
                            // `existingNames` with the basis names; this is the
                            // direction that wasn't.
                            // Asked from the reference's own position, since
                            // what a name means depends on where it sits, and
                            // only a *different* definition in scope is a
                            // reason to refuse: a member reference
                            // (`list.join(…)`) resolves through its receiver's
                            // type rather than lexically, so finding nothing
                            // here means nothing shadows it.
                            const shadow = reference.getDefinitionOfNameInScope(
                                translation,
                                newProject.getContext(source),
                            );
                            if (shadow !== undefined && shadow !== definition)
                                return [reference, reference];

                            return [reference, Reference.make(translation)];
                        }),
                );

                // Type annotations name their definition too — `zombie•Zombie` is
                // the same rename as `zombie`, but a `NameType` is not a
                // `Reference`, so the pass above never saw it. Left behind, every
                // annotation of a renamed structure stops resolving, which cascades:
                // a value whose type is unknown can't resolve its properties
                // either, so one missed rename becomes dozens of conflicts and a
                // program that no longer runs (#1276).
                newProject = newProject.withRevisedNodes(
                    newProject
                        .getSources()
                        .reduce(
                            (
                                names: { name: NameType; source: Source }[],
                                source,
                            ) => [
                                ...names,
                                ...source
                                    .nodes()
                                    .filter(
                                        (node): node is NameType =>
                                            node instanceof NameType,
                                    )
                                    .map((name) => ({ name, source })),
                            ],
                            [],
                        )
                        .map(({ name, source }) => {
                            const definition = name.resolve(
                                newProject.getContext(source),
                            );
                            if (definition === undefined) return [name, name];
                            if (
                                spellsPreservedName(
                                    definition,
                                    name.getName(),
                                    newProject.getSourceOf(definition) !==
                                        undefined,
                                )
                            )
                                return [name, name];
                            const translation = targetName(definition, false);
                            if (
                                translation === undefined ||
                                name.getName() === translation
                            )
                                return [name, name];
                            return [name, NameType.make(translation)];
                        }),
                );
            }

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
                            ? preserveTagged && target instanceof Names
                                ? withReplacedUntaggedNames(target, translation)
                                : Names.make([translation])
                            : withAddedName(names, translation, targetLanguage),
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

            // Re-key the sources last. Declaring a language brings its keyword
            // words with it, and tokens parsed before that don't become
            // keywords until something re-reads them — `withLocales` does this
            // for the same reason. It happens here rather than inside
            // `withPrimaryLocale` because re-keying rebuilds every source, and
            // doing that mid-pipeline orphans the nodes the passes above
            // gathered up front.
            return newProject.withKeywordedSources();
        };

        options?.phase?.('revising');
        const revised = build();

        // Refuse to hand back a program the translation broke, the way the
        // locale tooling refuses a localized example that stops analyzing
        // cleanly. In practice this catches reference retargeting that left a
        // name unresolved, which has no partial recovery — a half-bound program
        // is worse than an untranslated one. The baseline is counted on the
        // project with only its locale changed, because making the target
        // locale primary can change conflicts by itself and the translation
        // shouldn't be blamed for that.
        if (options?.validate === true) {
            const baseline = targetLocaleText
                ? project.withPrimaryLocale(targetLocaleText)
                : project;
            const after = countConflicts(revised);
            if (after > countConflicts(baseline)) {
                // Name what appeared, so a refusal is diagnosable from the log
                // rather than only by reproducing it offline.
                const kinds = new Set<string>();
                for (const list of revised.analyze().conflictedNodes.values())
                    for (const conflict of list)
                        kinds.add(conflict.constructor.name);
                options.report?.(
                    `it would have introduced conflicts (${[...kinds].sort().join(', ')})`,
                );
                return null;
            }
        }

        return revised;
    } catch (e) {
        console.error('translateProjectContent failed:', e);
        options?.report?.(
            `it threw (${e instanceof Error ? e.message : String(e)})`,
        );
        return null;
    }
}
