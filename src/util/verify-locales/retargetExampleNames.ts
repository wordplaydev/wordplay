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
import buildCounterparts from '@basis/counterparts';
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import UnaryEvaluate from '@nodes/UnaryEvaluate';
import type Definition from '@nodes/Definition';
import Evaluate from '@nodes/Evaluate';
import Input from '@nodes/Input';
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
    const enNodes = enSource.nodes();
    const loNodes = loSource.nodes();
    const aligned =
        enNodes.length === loNodes.length &&
        enNodes.every(
            (node, index) =>
                node.getDescriptor() === loNodes[index]?.getDescriptor(),
        );
    if (!aligned)
        return renames.length === 0
            ? { kind: 'divergent' }
            : splice(renames, loSource, localizedCode, locale);

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
    if (counterparts === undefined)
        return renames.length === 0
            ? { kind: 'unchanged' }
            : splice(renames, loSource, localizedCode, locale);

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
    if (loSource.code.getText() !== localizedCode) return { kind: 'refused' };
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
    if (spans.length !== renames.length) return { kind: 'refused' };

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
        return { kind: 'refused' };
    if (conflictCount(code, locale) > conflictCount(localizedCode, locale))
        return { kind: 'refused' };

    return { kind: 'retargeted', code, renamed: renames.length };
}
