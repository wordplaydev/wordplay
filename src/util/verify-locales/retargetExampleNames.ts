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
import Evaluate from '@nodes/Evaluate';
import Input from '@nodes/Input';
import Source from '@nodes/Source';
import type Token from '@nodes/Token';
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

    // Localizing an example only renames and replaces text, so the two trees are the same
    // shape. Anything else means the en-US example has since changed, and pairing nodes by
    // position would pair unrelated ones.
    const enNodes = enSource.nodes();
    const loNodes = loSource.nodes();
    if (
        enNodes.length !== loNodes.length ||
        enNodes.some(
            (node, index) =>
                node.getDescriptor() !== loNodes[index]?.getDescriptor(),
        )
    )
        return { kind: 'divergent' };

    const enContext = enProject.getContext(enSource);
    const loContext = loProject.getContext(loSource);

    // The name token to rewrite, and what to rewrite it to.
    const renames: { token: Token; name: string }[] = [];
    for (let index = 0; index < enNodes.length; index++) {
        const enNode = enNodes[index];
        const loNode = loNodes[index];
        if (!(enNode instanceof Input) || !(loNode instanceof Input)) continue;

        const enEvaluate = enSource.root.getParent(enNode);
        const loEvaluate = loSource.root.getParent(loNode);
        if (
            !(enEvaluate instanceof Evaluate) ||
            !(loEvaluate instanceof Evaluate)
        )
            continue;

        // Resolve the bind on the en-US side, where the name still binds, then take the
        // same position in the localized project's own basis. An input the locale renamed
        // out from under can't be resolved from the localized tree at all, which is the
        // whole reason the en-US example is here.
        const enFun = enEvaluate.getFunction(enContext);
        const loFun = loEvaluate.getFunction(loContext);
        if (enFun === undefined || loFun === undefined) continue;
        const enBind = enEvaluate
            .getInputMapping(enContext)
            ?.inputs.find((mapping) => mapping.given === enNode)?.expected;
        if (enBind === undefined) continue;
        const position = enFun.inputs.indexOf(enBind);
        if (position < 0 || position >= loFun.inputs.length) continue;

        // Not symbolic: asking for "any name in that language" is what turned `Phrase(…)`
        // into `💬(…)` in fr-FR, since a locale may list an emoji first. And a locale that
        // hasn't named this input keeps whatever the example says rather than falling back
        // to a name from somewhere else.
        const declared = loFun.inputs[position].names
            .getNameInLanguage(language, false)
            ?.getName();
        if (declared === undefined || declared === loNode.getName()) continue;

        renames.push({ token: loNode.name, name: declared });
    }

    if (renames.length === 0) return { kind: 'unchanged' };

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
export function retargetExamplesIn(
    enText: string,
    localizedText: string,
    locale: LocaleText,
): StringResult {
    const result: StringResult = {
        text: localizedText,
        renamed: 0,
        divergent: 0,
        refused: 0,
    };
    if (isUnwritten(localizedText)) return result;

    const enExamples = getDocExamples(withoutAnnotations(enText), true);
    const loExamples = getDocExamples(withoutAnnotations(localizedText), true);
    // Different numbers of examples is divergence of the coarsest kind; pairing by index
    // would compare unrelated programs.
    if (enExamples.length !== loExamples.length) {
        result.divergent += loExamples.length;
        return result;
    }

    const edits: { start: number; end: number; text: string }[] = [];
    let cursor = 0;
    for (let index = 0; index < loExamples.length; index++) {
        const example = loExamples[index];
        // An example whose serialization the tokenizer normalized (an emoji that carried a
        // presentation selector) isn't findable in the raw string. Skipping it is what keeps
        // the repair from writing the normalized copy back over the original.
        const start = localizedText.indexOf(example.text, cursor);
        if (start === -1) continue;
        cursor = start + example.text.length;
        if (example.expectsDefect || example.tokens <= 1) continue;

        const retargeted = retargetExampleNames(
            enExamples[index].code,
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

    let text = localizedText;
    for (const edit of edits.sort((a, b) => b.start - a.start))
        text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
    result.text = text;
    return result;
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
