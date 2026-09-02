/**
 * Re-derive a localized `\code\` example's named inputs from the names the target locale
 * declares, using the en-US example as the oracle for what each input is.
 *
 * A localized example is written into a locale file once and never revisited, but the names
 * it spells depend on a *different* locale path: `\Phrase('a' bubble: 'hello!')\` lives in
 * `output.Bubble.doc` while the word it must use is `output.Phrase.bubble.names`. Those are
 * translated in different phases and often different runs, so re-translating the name strands
 * the example on the word that was declared when it was localized — which is #1323's
 * `UnknownInput`, and also why ~150 inputs per locale are still spelled in English. The
 * lookup itself has always been right (translateProjectContent's Input pass); nothing was
 * re-running it.
 *
 * This is deliberately deterministic: no model, no API key, so `npm run locales-fix` can
 * repair the divergence instead of queueing a paid re-translation of the doc's prose.
 */

import type LanguageCode from '@locale/LanguageCode';
import type LocaleText from '@locale/LocaleText';
import { isUnwritten } from '@locale/LocaleText';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import DefaultLocale from '@locale/DefaultLocale';
import Project from '@db/projects/Project';
import {
    getComparedTextValues,
    shouldTranslateText,
} from '@db/projects/translatableText';
import { canonicalizeKeyName, localizeKeyName } from '@input/Key/Key';
import { WellKnownKeys } from '@input/Key/KeyboardKeys';
import {
    endOfNode,
    startOfNode,
    withoutMarkupContents,
} from '@db/projects/structuralPairing';
import buildCounterparts from '@basis/counterparts';
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import UnaryEvaluate from '@nodes/UnaryEvaluate';
import type Definition from '@nodes/Definition';
import Evaluate from '@nodes/Evaluate';
import Input from '@nodes/Input';
import { LanguageTagged } from '@nodes/LanguageTagged';
import Language from '@nodes/Language';
import Names from '@nodes/Names';
import TextLiteral from '@nodes/TextLiteral';
import NameType from '@nodes/NameType';
import type Node from '@nodes/Node';
import Reference from '@nodes/Reference';
import Source from '@nodes/Source';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';
import type Tutorial from '../../tutorial/Tutorial';
import { type Dialog } from '../../tutorial/Tutorial';
import { alignTutorialLines } from '@util/verify-locales/syncTutorialStructure';
import getDocExamples from '@util/verify-locales/docExamples';
import {
    hasUnclosedText,
    mismatchedDelimiter,
} from '@util/verify-locales/protect';

/** How an example's names were left, for a caller deciding what to report. */
export type RetargetResult =
    | { kind: 'unchanged' }
    /** The example's code with `renamed` input names replaced. */
    | { kind: 'retargeted'; code: string; renamed: number }
    /** The two examples no longer have the same shape, so nothing can be aligned; the en-US
     *  example changed after this one was localized and only a re-translation can fix it. */
    | { kind: 'divergent' }
    /** Retargeting would have introduced conflicts or broken a delimiter, so nothing was done. */
    | { kind: 'refused' };

/**
 * The en-US basis paired with a locale's, memoized on the locale's basis.
 *
 * `Basis.getLocalizedBasis` hands back the same object for a locale, so the map can be built
 * once instead of per example — the difference between one walk and 27,000 of them.
 */
const counterpartCache = new WeakMap<object, Map<Node, Node> | undefined>();
function getCounterparts(
    enProject: Project,
    loProject: Project,
): Map<Node, Node> | undefined {
    const basis = loProject.basis;
    if (!counterpartCache.has(basis))
        counterpartCache.set(basis, buildCounterparts(enProject.basis, basis));
    return counterpartCache.get(basis);
}

/** Hebrew points and cantillation, the same marks `checkPointedNames` takes off a locale's
 *  declared names. An example spells those names too, so it has to follow. */
const HebrewMarks = /[֑-ׇ]/gu;

/** Whether a node paired by `buildCounterparts` is a definition — everything it pairs is, but
 *  the map is typed as nodes, and only a definition has the `names` this pass reads. */
function isDefinition(node: Node): node is Node & Definition {
    return 'names' in node;
}

// `withoutMarkupContents` and the span helpers live in structuralPairing.ts,
// shared with the gallery examples' load-time compositing (#1310).

/**
 * Re-attach the language tags a localized example lost.
 *
 * Several en-US examples exist to *teach* language tags — `\"Language"/en\` in `node.Language.doc`,
 * `\'hello'/en'hola'/es-MX\` in `basis.Text.doc`, the landing page's list of greetings. Localizing
 * one drops the tag (a `Translation`, `Name`, or `Doc` keeps its text and loses its `Language`),
 * so every locale ships the lesson with its subject missing, and re-translating reproduces it
 * exactly. Nothing else re-derives them, so this does.
 *
 * The tag is taken from the en-US oracle: a tag naming the source language becomes the reader's
 * language, since that option is the one whose text was translated, and any other tag is content —
 * `/es`, `/tr`, `/es_en` name what the text *is*, not who is reading — so it is restored verbatim.
 *
 * Returns the repaired code, or undefined when there is nothing to restore or the two examples
 * differ by more than their tags.
 */
function restoreLanguageTags(
    enSource: Source,
    loSource: Source,
    localizedCode: string,
    language: LanguageCode,
): string | undefined {
    // Compare with the tags themselves left out — and with every option after the first, since
    // localizing a multilingual literal keeps only the one whose text it translated. What
    // remains must line up exactly, or the examples differ by something this can't reason about.
    const elide = (source: Source) => {
        const nodes = withoutMarkupContents(source);
        const inside = new Set<Node>();
        const drop = (node: Node) => {
            for (const descendant of node.nodes()) inside.add(descendant);
        };
        for (const node of nodes) {
            if (node instanceof Language) drop(node);
            else if (node instanceof TextLiteral)
                for (const option of node.texts.slice(1)) drop(option);
            else if (node instanceof Names) {
                for (const name of node.names.slice(1)) drop(name);
                // A separator is a *trailing* field of the name before it, so dropping the
                // extra names leaves its comma behind and the two sides differ by one token.
                for (const name of node.names)
                    if (name.separator !== undefined)
                        inside.add(name.separator);
            }
        }
        return nodes.filter((node) => !inside.has(node));
    };
    const enNodes = elide(enSource);
    const loNodes = elide(loSource);
    if (
        enNodes.length !== loNodes.length ||
        enNodes.some(
            (node, index) =>
                node.getDescriptor() !== loNodes[index]?.getDescriptor(),
        )
    )
        return undefined;

    const startOf = startOfNode;
    const endOf = endOfNode;

    // Restored text is read from the source rather than re-serialized, so an emoji carrying a
    // presentation selector survives — the `toWordplay` trap `splice` documents. The offsets
    // index the serialized source, so a program whose serialization isn't what we were handed
    // can't be spliced at all.
    if (loSource.code.getText() !== localizedCode) return undefined;
    const enGraphemes = [...enSource.code.getGraphemes()];
    const loGraphemes = [...loSource.code.getGraphemes()];

    // `order` breaks ties at one position: a first option's tag goes before the options
    // restored after it.
    const edits: { at: number; length: number; order: number; text: string }[] =
        [];
    for (let index = 0; index < enNodes.length; index++) {
        const enNode = enNodes[index];
        const loNode = loNodes[index];

        if (
            enNode instanceof LanguageTagged &&
            loNode instanceof LanguageTagged &&
            enNode.language !== undefined
        ) {
            const codes = enNode.language.getLanguageCodes();
            if (codes.length === 1 && codes[0] === DefaultLocale.language) {
                // Already tagged: nothing to say about it.
                if (loNode.language !== undefined) continue;
                // A tag naming the source language marks the option whose text was translated,
                // so it becomes the reader's language.
                const at = endOf(loSource, loNode);
                if (at === undefined) return undefined;
                edits.push({ at, length: 0, order: 0, text: `/${language}` });
            } else {
                // Any other tag says what the text *is* — `'hola'/es` is Spanish for every
                // reader — so the whole option comes back from en-US. Translating one is the
                // mistake the tag exists to warn about, and locales did make it: sr-RS shipped
                // `конничива` where en-US has `こんにちは`.
                const at = startOf(loSource, loNode);
                const end = endOf(loSource, loNode);
                const from = startOf(enSource, enNode);
                const to = endOf(enSource, enNode);
                if (
                    at === undefined ||
                    end === undefined ||
                    from === undefined ||
                    to === undefined
                )
                    return undefined;
                const text = enGraphemes.slice(from, to).join('');
                if (text === loGraphemes.slice(at, end).join('')) continue;
                edits.push({ at, length: end - at, order: 0, text });
            }
        }

        // Options the localizer dropped, restored verbatim: they are text in another language,
        // not something a translation replaces. Taken as one span from the end of the last
        // option the locale kept, so a name's separator and the spacing come with it.
        const kept =
            enNode instanceof TextLiteral && loNode instanceof TextLiteral
                ? enNode.texts.length > loNode.texts.length
                    ? enNode.texts[loNode.texts.length - 1]
                    : undefined
                : enNode instanceof Names && loNode instanceof Names
                  ? enNode.names.length > loNode.names.length
                      ? (() => {
                            const name = enNode.names[loNode.names.length - 1];
                            return name.language ?? name.name;
                        })()
                      : undefined
                  : undefined;
        if (kept !== undefined) {
            const at = endOf(loSource, loNode);
            const from = endOf(enSource, kept);
            const to = endOf(enSource, enNode);
            if (at === undefined || from === undefined || to === undefined)
                return undefined;
            edits.push({
                at,
                length: 0,
                order: 1,
                text: enGraphemes.slice(from, to).join(''),
            });
        }
    }
    if (edits.length === 0) return undefined;

    // Grapheme space, and last first, for the reasons `splice` gives.
    const graphemes = [...loGraphemes];
    for (const edit of [...edits].sort(
        (a, b) => b.at - a.at || b.order - a.order,
    ))
        graphemes.splice(edit.at, edit.length, edit.text);
    return graphemes.join('');
}

/** Conflicts in a program, analyzed in one locale. Deliberately not `analyzeCode`, whose cache
 *  is unbounded: the codes measured here are one-off repair candidates, not examples anything
 *  will ask about again. */
function conflictCount(code: string, locale: LocaleText): number {
    return Array.from(
        Project.make(null, 'example', new Source('start', code), [], locale)
            .analyze()
            .conflictedNodes.values(),
    ).flat().length;
}

export function retargetExampleNames(
    enCode: string,
    localizedCode: string,
    locale: LocaleText,
    language: LanguageCode,
): RetargetResult {
    // Building a project can throw on a locale whose basis won't parse (an invalid declared
    // name, which `checkNames` is what reports). Renaming inputs is not the check that should
    // stop a verify run over it, so treat it the way every other unanalyzable example is
    // treated: leave it alone.
    try {
        return retarget(enCode, localizedCode, locale, language);
    } catch {
        return { kind: 'refused' };
    }
}

/**
 * The renames one en/lo source pair needs, inside their (possibly
 * multi-source) projects: vowel-point cleanups always, and the input,
 * reference, and type retargets only when the pair's shapes align. Resolution
 * runs against the whole project, so a multi-source example's cross-source
 * references resolve the way they do in the app.
 */
function collectSourceRenames(
    enProject: Project,
    loProject: Project,
    enSource: Source,
    loSource: Source,
    language: LanguageCode,
): { aligned: boolean; renames: { token: Token; name: string }[] } {
    // The name token to rewrite, and what to rewrite it to.
    const renames: { token: Token; name: string }[] = [];

    // Vowel points come off every name the example spells, before anything else. This needs no
    // en-US counterpart — it changes a name's orthography, not which name it is — so unlike
    // everything below it still applies when the two examples no longer line up, which is how
    // the landing-page tour examples (whose translation dropped en-US's language tags) get
    // repaired at all. Only name tokens: a text literal's pointing is prose, and its author's.
    for (const token of loSource.leaves()) {
        if (!(token instanceof Token) || !token.isSymbol(Sym.Name)) continue;
        const plain = token.getText().replace(HebrewMarks, '');
        if (plain !== token.getText() && plain.length > 0)
            renames.push({ token, name: plain });
    }

    // Localizing an example only renames and replaces text, so the two trees are the same
    // shape. Anything else means the en-US example has since changed, and pairing nodes by
    // position would pair unrelated ones.
    //
    // Prose inside a `¶…¶` doc is the exception: markup emits one `Words` token per line, so
    // a translation that reflowed a paragraph onto one line has fewer nodes while its code is
    // untouched — which is why every locale's `choose-adventure` how-to and `node.Markup.doc`
    // read as divergent though no code differs. Nothing below renames inside markup (only
    // `Input`, `Reference`, and `NameType` are retargeted, and a doc holds none of them), so
    // markup's contents are left out of both the comparison and the pairing. An example
    // nested inside a doc is left out with it, which forgoes a rename rather than risking a
    // wrong one.
    const enNodes = withoutMarkupContents(enSource);
    const loNodes = withoutMarkupContents(loSource);
    const aligned =
        enNodes.length === loNodes.length &&
        enNodes.every(
            (node, index) =>
                node.getDescriptor() === loNodes[index]?.getDescriptor(),
        );
    if (!aligned) return { aligned, renames };

    const enContext = enProject.getContext(enSource);
    const loContext = loProject.getContext(loSource);

    // `buildCounterparts` walks the two bases in parallel and pairs each definition with the
    // same definition built for the other locale, refusing rather than guessing when the
    // spines don't line up. Everything below resolves on the en-US side — where the names are
    // canonical — and crosses over here, so nothing depends on the localized example still
    // resolving. That last part is load-bearing: when a locale renames a *type*, the example's
    // own reference to it stops resolving, and asking the localized tree for the function
    // would then skip its inputs too, stranding them. Stripping Hebrew vowel points is what
    // exposed that — the reference was repaired and the input beside it was not.
    const counterparts = getCounterparts(enProject, loProject);
    if (counterparts === undefined) return { aligned, renames };

    for (let index = 0; index < enNodes.length; index++) {
        const enNode = enNodes[index];
        const loNode = loNodes[index];
        if (!(enNode instanceof Input) || !(loNode instanceof Input)) continue;

        const enEvaluate = enSource.root.getParent(enNode);
        if (!(enEvaluate instanceof Evaluate)) continue;
        const enBind = enEvaluate
            .getInputMapping(enContext)
            ?.inputs.find((mapping) => mapping.given === enNode)?.expected;
        if (enBind === undefined) continue;
        const bind = counterparts.get(enBind);
        if (bind === undefined || !isDefinition(bind)) continue;

        // Not symbolic: asking for "any name in that language" is what turned `Phrase(…)`
        // into `💬(…)` in fr-FR, since a locale may list an emoji first. And a locale that
        // hasn't named this input keeps whatever the example says rather than falling back
        // to a name from somewhere else.
        const declared = bind.names
            .getNameInLanguage(language, false)
            ?.getName();
        if (declared === undefined || declared === loNode.getName()) continue;

        renames.push({ token: loNode.name, name: declared });
    }

    // Now the names that aren't inputs: a `Reference` naming a built-in, and a `NameType`
    // annotating one. Renaming a *type* strands these rather than an input, so a locale that
    // renames `Place` leaves `מָקוֹם(0m 0m)` naming nothing.
    for (let index = 0; index < enNodes.length; index++) {
        const enNode = enNodes[index];
        const loNode = loNodes[index];
        if (!(
            (enNode instanceof Reference && loNode instanceof Reference) ||
            (enNode instanceof NameType && loNode instanceof NameType)
        ))
            continue;

        // An operator is never retargeted. Its name is symbolic and comes from en-US, so a
        // locale rename can't strand it — and its function resolves through the left operand's
        // type rather than lexically, so "does this still resolve?" can't be asked of it.
        // Retargeting one anyway rewrote `×` to the Hebrew word for multiply, which is the
        // `+` → `أضف` damage this pass exists to avoid.
        const parent = enSource.root.getParent(enNode);
        if (
            (parent instanceof BinaryEvaluate ||
                parent instanceof UnaryEvaluate) &&
            parent.fun === enNode
        )
            continue;

        const enDefinition = enNode.resolve(enContext);
        if (enDefinition === undefined) continue;
        // A definition the example declares itself is the creator's, translated with the
        // example; the basis is the only thing this pass owns.
        if (enProject.getSourceOf(enDefinition) !== undefined) continue;
        const expected = counterparts.get(enDefinition);
        if (expected === undefined || !isDefinition(expected)) continue;

        // Unlike an input — whose name is fully determined by the bind it fills — a
        // reference may use any of a definition's names, and localized examples lean on
        // the symbolic ones constantly (`🕕` for Time, `📏` for length, `⊆` for has).
        // So this only repairs a reference that has stopped naming the right definition;
        // rewriting every one to the declared word would have changed 12,027 examples,
        // nearly all of them for the worse.
        if (loNode.resolve(loContext) === expected) continue;

        // A name written as a word stays a word and an emoji stays an emoji — the
        // `symbolic ?? false` rule, where asking for "any name" is what turned `Phrase(…)`
        // into `💬(…)` in fr-FR. And no falling back across kinds: a locale with no name of
        // the right kind keeps what the example already says.
        const symbolic = !/\p{L}/u.test(loNode.getName());
        const declared = expected.names
            .getNameInLanguage(language, symbolic)
            ?.getName();
        if (declared === undefined || declared === loNode.getName()) continue;

        renames.push({ token: loNode.name, name: declared });
    }

    // Key-name literals in data positions follow the locale's key table, not a
    // translation: the Key stream reports a well-known key as the PRIMARY
    // locale's display name, so an es-MX example must compare `'Espacio'`
    // where its master compares `'Space'` — the deliberate #1276-style
    // protection that keeps the string English at translation time is exactly
    // what strands it here. Derived from the same table the stream reads, so
    // the repair is deterministic and re-runs when a locale renames its keys.
    const knownKeys = new Set<string>(WellKnownKeys);
    const enComparedValues = getComparedTextValues(enProject);
    const enLocales = enProject.getLocales();
    const loLocales = loProject.getLocales();
    for (let index = 0; index < enNodes.length; index++) {
        const enNode = enNodes[index];
        const loNode = loNodes[index];
        if (
            !(enNode instanceof TextLiteral) ||
            !(loNode instanceof TextLiteral)
        )
            continue;
        if (shouldTranslateText(enNode, enProject, enComparedValues)) continue;
        const enOption = enNode.texts.find(
            (text) => text.getLanguage() === undefined,
        );
        const loOption = loNode.texts.find(
            (text) => text.getLanguage() === undefined,
        );
        const enSegment = enOption?.segments[0];
        const loSegment = loOption?.segments[0];
        if (
            enOption === undefined ||
            loOption === undefined ||
            enOption.segments.length !== 1 ||
            loOption.segments.length !== 1 ||
            !(enSegment instanceof Token) ||
            !(loSegment instanceof Token)
        )
            continue;
        const enText = enOption.getText();
        // Letters required: a bare `' '` literal is a join separator, not the
        // space key.
        if (!/\p{L}/u.test(enText)) continue;
        const canonical = canonicalizeKeyName(enText, enLocales);
        if (!knownKeys.has(canonical)) continue;
        const localized = localizeKeyName(canonical, loLocales);
        const loText = loOption.getText();
        if (localized.length === 0 || loText === localized) continue;
        // Only a value still naming the same key is repaired — verbatim
        // English, or an older display name the locale has since renamed.
        if (
            loText !== enText &&
            canonicalizeKeyName(loText, loLocales) !== canonical
        )
            continue;
        renames.push({ token: loSegment, name: localized });
    }

    return { aligned: true, renames };
}

function retarget(
    enCode: string,
    localizedCode: string,
    locale: LocaleText,
    language: LanguageCode,
): RetargetResult {
    const enProject = Project.make(
        null,
        'en',
        new Source('start', enCode),
        [],
        DefaultLocale,
    );
    const loProject = Project.make(
        null,
        'localized',
        new Source('start', localizedCode),
        [],
        locale,
    );
    const enSource = enProject.getSources()[0];
    const loSource = loProject.getSources()[0];
    if (enSource === undefined || loSource === undefined)
        return { kind: 'divergent' };

    // A localized example that differs from en-US only in what its language tags carry is
    // repairable rather than divergent; putting those back makes the two the same shape again,
    // so the retargeting below can run on the result.
    const restored = restoreLanguageTags(
        enSource,
        loSource,
        localizedCode,
        language,
    );
    if (
        restored !== undefined &&
        restored !== localizedCode &&
        // Never hand back an example the restore broke — the guarantee `splice` makes. A
        // locale whose own word already *is* the other language's gets a duplicate name
        // otherwise: es-MX translates `cat` to `gato`, which is exactly what en-US's second
        // option says, so restoring it produced `gato/es, gato/es`.
        conflictCount(restored, locale) <= conflictCount(localizedCode, locale)
    ) {
        const result = retarget(enCode, restored, locale, language);
        return result.kind === 'retargeted'
            ? { ...result, renamed: result.renamed + 1 }
            : { kind: 'retargeted', code: restored, renamed: 1 };
    }

    const { aligned, renames } = collectSourceRenames(
        enProject,
        loProject,
        enSource,
        loSource,
        language,
    );

    if (!aligned)
        return renames.length === 0
            ? { kind: 'divergent' }
            : splice(renames, loSource, localizedCode, locale);

    if (renames.length === 0) return { kind: 'unchanged' };
    return splice(renames, loSource, localizedCode, locale);
}

/** What retargeting did to one string, for a caller reporting it. */
export type StringResult = {
    /** The string, with every example that could be retargeted rewritten. */
    text: string;
    /** How many input names were renamed. */
    renamed: number;
    /** Examples whose shape no longer matches en-US, so they need re-translating. */
    divergent: number;
    /** Examples a repair would have broken, so they were left alone. */
    refused: number;
};

/**
 * Retarget every `\code\` example in one markup string against its en-US counterpart.
 *
 * An unwritten string is left alone: its example is English on purpose, and giving it the
 * locale's input names would make a program in no language at all.
 */
/** What retargeting did to one document, for a caller reporting it. */
export type DocumentResult = Omit<StringResult, 'text'> & {
    /** The document's items, with every example that could be retargeted rewritten. */
    texts: string[];
};

/**
 * Retarget every `\code\` example in one document against its en-US counterpart.
 *
 * A document is a `[formatted]` array whose items are paragraphs, or a single string. Examples
 * are paired **across the whole document, not per item**: a locale may legitimately split or
 * merge a paragraph (`checkStringArrays` allows markup arrays to differ in length), and
 * pairing per item skipped the whole path whenever it did — which is how a stale
 * `basis.List.function.sansAll` example survived a repair run. Example counts are far steadier
 * than paragraph counts, since localizing an example never adds or removes one.
 *
 * A document whose first item is unwritten is left alone: its examples are English on purpose
 * (and the write status lives on the first item only), and half-retargeting them makes a
 * program in no language.
 */
export function retargetExamplesInDocument(
    enItems: string[],
    items: string[],
    locale: LocaleText,
): DocumentResult {
    const result: DocumentResult = {
        texts: items,
        renamed: 0,
        divergent: 0,
        refused: 0,
    };
    if (items.length === 0 || isUnwritten(items[0])) return result;

    const enExamples = enItems.flatMap((item) =>
        getDocExamples(withoutAnnotations(item), true),
    );
    const found = items.map((item) =>
        getDocExamples(withoutAnnotations(item), true),
    );
    const total = found.reduce((sum, list) => sum + list.length, 0);
    // Different numbers of examples is divergence of the coarsest kind; pairing by index
    // would compare unrelated programs.
    if (enExamples.length !== total) {
        result.divergent += total;
        return result;
    }

    let position = 0;
    result.texts = items.map((item, itemIndex) => {
        const edits: { start: number; end: number; text: string }[] = [];
        let cursor = 0;
        for (const example of found[itemIndex]) {
            const en = enExamples[position++];
            // An example whose serialization the tokenizer normalized (an emoji that carried
            // a presentation selector) isn't findable in the raw string. Skipping it is what
            // keeps the repair from writing the normalized copy back over the original.
            const start = item.indexOf(example.text, cursor);
            if (start === -1) continue;
            cursor = start + example.text.length;
            if (example.expectsDefect || example.tokens <= 1) continue;

            const retargeted = retargetExampleNames(
                en.code,
                example.code,
                locale,
                locale.language,
            );
            if (retargeted.kind === 'divergent') result.divergent++;
            else if (retargeted.kind === 'refused') result.refused++;
            else if (retargeted.kind === 'retargeted') {
                // The example's `text` is its `code` plus delimiters and annotations, and the
                // code appears in it once, so replacing it there keeps the 🪲 and the `\`.
                const offset = example.text.indexOf(example.code);
                if (offset === -1) continue;
                edits.push({
                    start: start + offset,
                    end: start + offset + example.code.length,
                    text: retargeted.code,
                });
                result.renamed += retargeted.renamed;
            }
        }
        let text = item;
        for (const edit of edits.sort((a, b) => b.start - a.start))
            text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
        return text;
    });
    return result;
}

/** The single-string case of {@link retargetExamplesInDocument}. */
export function retargetExamplesIn(
    enText: string,
    localizedText: string,
    locale: LocaleText,
): StringResult {
    const { texts, ...tally } = retargetExamplesInDocument(
        [enText],
        [localizedText],
        locale,
    );
    return { text: texts[0] ?? localizedText, ...tally };
}

/**
 * Retarget the examples in every dialog line of a tutorial, against the en-US tutorial.
 *
 * Lines are paired with `alignTutorialLines` rather than by index: a locale that is a scene
 * or a line short of en-US would otherwise be compared against a different lesson, and an
 * isomorphic example from the wrong lesson would be renamed against the wrong bind.
 *
 * Mutates `tutorial` when `apply`; otherwise only tallies, so a verify run stays read-only.
 */
function isDialog(line: unknown): line is Dialog {
    return Array.isArray(line);
}

export function retargetTutorialExamples(
    tutorial: Tutorial,
    defaultTutorial: Tutorial,
    locale: LocaleText,
    apply: boolean,
): Omit<StringResult, 'text'> {
    const counterparts = alignTutorialLines(defaultTutorial, tutorial);
    const tally = { renamed: 0, divergent: 0, refused: 0 };
    for (const act of tutorial.acts)
        for (const scene of act.scenes)
            for (const line of scene.lines) {
                // Dialog is an array; a performance is an object and a pause is null.
                if (!isDialog(line)) continue;
                const counterpart = counterparts.get(line);
                if (counterpart === undefined || !isDialog(counterpart))
                    continue;
                for (
                    let index = 2;
                    index < line.length && index < counterpart.length;
                    index++
                ) {
                    const text = line[index];
                    const english = counterpart[index];
                    if (
                        typeof text !== 'string' ||
                        typeof english !== 'string' ||
                        !text.includes('\\')
                    )
                        continue;
                    const result = retargetExamplesIn(english, text, locale);
                    tally.renamed += result.renamed;
                    tally.divergent += result.divergent;
                    tally.refused += result.refused;
                    if (apply && result.text !== text)
                        line[index] = result.text;
                }
            }
    return tally;
}

/**
 * The example's text with each rename spliced in, or a refusal.
 *
 * Splices rather than re-serializing: the tokenizer strips U+FE0F from the source it reads
 * (`withoutColorSelector`), so rebuilding an example through `toWordplay` would quietly turn
 * `'🖐️'` into `'🖐'` in every locale that carries one. Replacing only the name spans touches
 * nothing else.
 */
function splice(
    proposed: { token: Token; name: string }[],
    loSource: Source,
    localizedCode: string,
    locale: LocaleText,
): RetargetResult {
    const spliced = spliceRenames(proposed, loSource, localizedCode);
    if (spliced === undefined) return { kind: 'refused' };
    if (
        conflictCount(spliced.code, locale) >
        conflictCount(localizedCode, locale)
    )
        return { kind: 'refused' };

    return { kind: 'retargeted', code: spliced.code, renamed: spliced.renamed };
}

/**
 * The splice itself, minus the conflict guard, which needs the code's whole
 * project — one source here, but the whole file for a multi-source example.
 * Returns undefined when the splice can't be done or broke a delimiter.
 */
function spliceRenames(
    proposed: { token: Token; name: string }[],
    loSource: Source,
    localizedCode: string,
): { code: string; renamed: number } | undefined {
    // One rename per token. Two passes can claim the same one — a pointed input name is both
    // a name to unpoint and a name to re-derive — and splicing a token twice eats the text
    // after it, which is how `צֶבַע: Color(…)` became `צבעColor(…)`. The later claim wins,
    // since the declared name is more specific than the orthography rule.
    const byToken = new Map<Token, string>();
    for (const rename of proposed) byToken.set(rename.token, rename.name);
    const renames = [...byToken].map(([token, name]) => ({ token, name }));
    // Splice the names into the original text rather than re-serializing the example. The
    // tokenizer strips U+FE0F from the source it reads (`withoutColorSelector`), so
    // rebuilding an example through `toWordplay` would quietly turn `'🖐️'` into `'🖐'` in
    // every locale that carries one. Replacing only the name spans touches nothing else.
    //
    // Token positions are *grapheme* offsets, not UTF-16 ones (`Source` counts with
    // `UnicodeString.getLength()`), so the splice happens in grapheme space — an example with
    // an emoji before the input, which is most of them, lands mid-character otherwise. The
    // offsets index the serialized source, so a program whose serialization isn't what we were
    // handed can't be spliced at all.
    if (loSource.code.getText() !== localizedCode) return undefined;
    const spans = renames
        .map(({ token, name }) => ({
            start: loSource.getTokenTextPosition(token),
            length: token.text.getLength(),
            name,
        }))
        .filter(
            (span): span is { start: number; length: number; name: string } =>
                span.start !== undefined,
        )
        // Last first, so earlier offsets stay valid.
        .sort((a, b) => b.start - a.start);
    if (spans.length !== renames.length) return undefined;

    const graphemes = [...loSource.code.getGraphemes()];
    for (const span of spans)
        graphemes.splice(span.start, span.length, span.name);
    const code = graphemes.join('');

    // Never hand back an example the repair broke — the same guarantee the example localizer
    // makes. A declared name that doesn't bind, or one carrying a text delimiter, is worse
    // than the stale word it replaced.
    if (
        mismatchedDelimiter(localizedCode, code) !== undefined ||
        (!hasUnclosedText(localizedCode) && hasUnclosedText(code))
    )
        return undefined;

    return { code, renamed: renames.length };
}

/** A serialized example's source: its `=== ` header names and its code. */
export type SerializedExampleSource = { names: string; code: string };

/** What retargeting did to a whole serialized example file. */
export type SerializedRetargetResult =
    | { kind: 'unchanged' }
    /** The file's sources with `renamed` names replaced. */
    | {
          kind: 'retargeted';
          sources: SerializedExampleSource[];
          renamed: number;
      }
    | { kind: 'divergent' }
    | { kind: 'refused' };

/**
 * Retarget a whole localized `.wp` example against its en-US master — the
 * multi-source counterpart of {@link retargetExampleNames}. Sources are paired
 * positionally (the pipeline writes one localized source per master source),
 * resolution runs in the full multi-source project so cross-source references
 * work, and the conflict guard analyzes the whole file, since a rename in one
 * source can strand a borrow in another. Any misaligned source makes the whole
 * file divergent: it means the master changed, and only re-translation fixes
 * that.
 */
export function retargetSerializedExample(
    enSources: SerializedExampleSource[],
    loSources: SerializedExampleSource[],
    locale: LocaleText,
    language: LanguageCode,
): SerializedRetargetResult {
    // The same shield retargetExampleNames raises: an unanalyzable locale
    // shouldn't crash the run, just leave the example alone.
    try {
        return retargetSerialized(enSources, loSources, locale, language, 0);
    } catch {
        return { kind: 'refused' };
    }
}

function makeMultiSourceProject(
    id: string,
    sources: SerializedExampleSource[],
    locale: LocaleText,
): Project | undefined {
    const [main, ...supplements] = sources.map(
        (source) => new Source(source.names, source.code),
    );
    return main === undefined
        ? undefined
        : Project.make(null, id, main, supplements, locale);
}

function conflictCountOf(project: Project): number {
    return Array.from(project.analyze().conflictedNodes.values()).flat().length;
}

function retargetSerialized(
    enSources: SerializedExampleSource[],
    loSources: SerializedExampleSource[],
    locale: LocaleText,
    language: LanguageCode,
    depth: number,
): SerializedRetargetResult {
    if (enSources.length !== loSources.length) return { kind: 'divergent' };
    const enProject = makeMultiSourceProject('en', enSources, DefaultLocale);
    const loProject = makeMultiSourceProject('localized', loSources, locale);
    if (enProject === undefined || loProject === undefined)
        return { kind: 'divergent' };

    // Restore dropped or translated language tags per source and re-run on the
    // restored file, as the single-source path does. Depth-bounded: a restore
    // that changed nothing structural would otherwise recurse forever.
    if (depth === 0) {
        let anyRestored = false;
        const restoredSources = loSources.map((lo, index) => {
            const enSource = enProject.getSources()[index];
            const loSource = loProject.getSources()[index];
            if (enSource === undefined || loSource === undefined) return lo;
            const restored = restoreLanguageTags(
                enSource,
                loSource,
                lo.code,
                language,
            );
            if (restored !== undefined && restored !== lo.code) {
                anyRestored = true;
                return { ...lo, code: restored };
            }
            return lo;
        });
        if (anyRestored) {
            const restoredProject = makeMultiSourceProject(
                'restored',
                restoredSources,
                locale,
            );
            if (
                restoredProject !== undefined &&
                conflictCountOf(restoredProject) <= conflictCountOf(loProject)
            ) {
                const result = retargetSerialized(
                    enSources,
                    restoredSources,
                    locale,
                    language,
                    1,
                );
                return result.kind === 'retargeted'
                    ? { ...result, renamed: result.renamed + 1 }
                    : {
                          kind: 'retargeted',
                          sources: restoredSources,
                          renamed: 1,
                      };
            }
        }
    }

    let renamed = 0;
    const rewritten: SerializedExampleSource[] = [];
    for (let index = 0; index < loSources.length; index++) {
        const enSource = enProject.getSources()[index];
        const loSource = loProject.getSources()[index];
        if (enSource === undefined || loSource === undefined)
            return { kind: 'divergent' };
        const { aligned, renames } = collectSourceRenames(
            enProject,
            loProject,
            enSource,
            loSource,
            language,
        );
        if (!aligned) return { kind: 'divergent' };
        if (renames.length === 0) {
            rewritten.push(loSources[index]);
            continue;
        }
        const spliced = spliceRenames(renames, loSource, loSources[index].code);
        if (spliced === undefined) return { kind: 'refused' };
        renamed += spliced.renamed;
        rewritten.push({ ...loSources[index], code: spliced.code });
    }
    if (renamed === 0) return { kind: 'unchanged' };

    const revised = makeMultiSourceProject('revised', rewritten, locale);
    if (
        revised === undefined ||
        conflictCountOf(revised) > conflictCountOf(loProject)
    )
        return { kind: 'refused' };
    return { kind: 'retargeted', sources: rewritten, renamed };
}
