/**
 * Load-time compositing of localized gallery examples (#1310): given the
 * viewer's best available file as a base and the other chosen locales' files,
 * produce one multilingual project carrying every chosen language, the way a
 * creator would have written it by hand — the base's untagged (own-language)
 * names and text tagged with the base's locale, and each secondary's
 * translations appended as tagged options.
 *
 * The pairing invariant comes from the pipeline: every per-locale file is a
 * `preserveTagged` rewrite of the same master, so outside markup contents the
 * files are node-isomorphic. Anything that isn't isomorphic (a stale file from
 * an older master) drops that secondary entirely — never a partial merge — and
 * the viewer still gets the base.
 *
 * Everything is spliced into the base's raw text by grapheme offset, insertions
 * only. Re-serializing through `toWordplay` would strip U+FE0F from emoji
 * (`Source` reads code through the tokenizer), the same trap
 * `retargetExampleNames` documents.
 *
 * The base's untagged options are tagged (`/es-MX`) whenever a secondary
 * contributes a differing option, because `getPreferred` walks the viewer's
 * locales in order and an untagged option never *matches* — left untagged, the
 * primary language would lose to a secondary's tagged option and the page
 * would read in the wrong language.
 */

import { parseAsMultilingualName } from '@db/projects/getLocalizedProjectName';
import type { SerializedProject } from '@db/projects/ProjectSchemas';
import {
    endOfNode,
    startOfNode,
    withoutMarkupContents,
} from '@db/projects/structuralPairing';
import Doc from '@nodes/Doc';
import Docs from '@nodes/Docs';
import FormattedLiteral from '@nodes/FormattedLiteral';
import type FormattedTranslation from '@nodes/FormattedTranslation';
import Names from '@nodes/Names';
import type Node from '@nodes/Node';
import Source from '@nodes/Source';
import TextLiteral from '@nodes/TextLiteral';
import type Translation from '@nodes/Translation';

/** One input to a composite: a locale code and the example parsed from its
 *  `.wp` file (the en-US master counts as the `en-US` input). */
export type CompositeInput = {
    locale: string;
    project: SerializedProject;
};

type Edit = { at: number; order: number; text: string };

/** The text option nodes a literal carries, uniformly across the three kinds. */
function optionsOf(
    node: TextLiteral | Docs | FormattedLiteral,
): (Translation | Doc | FormattedTranslation)[] {
    return node instanceof Docs ? node.docs : node.texts;
}

export function compositeExample(
    id: string,
    base: CompositeInput,
    secondaries: CompositeInput[],
): SerializedProject {
    const baseSources = base.project.sources.map(
        (source) => new Source(source.names, source.code),
    );
    const baseNodes = baseSources.map(withoutMarkupContents);
    const baseGraphemes = baseSources.map((source) => [
        ...source.code.getGraphemes(),
    ]);

    const editsBySource: Edit[][] = baseSources.map(() => []);
    /** Base-locale tag insertions already made, keyed by source and position,
     *  so two secondaries contributing to one option tag it once. */
    const tagged = new Set<string>();
    /** The words already on each base `Names`, so two secondaries sharing a
     *  translation don't append a duplicate name (which would conflict). */
    const namesOn = new Map<Node, Set<string>>();
    const kept: CompositeInput[] = [];

    for (let index = 0; index < secondaries.length; index++) {
        const secondary = secondaries[index];
        if (secondary.project.sources.length !== baseSources.length) continue;
        const secSources = secondary.project.sources.map(
            (source) => new Source(source.names, source.code),
        );
        const secNodes = secSources.map(withoutMarkupContents);

        // A secondary merges whole or not at all: verify every source pair
        // aligns before committing any of its edits.
        const aligned = baseSources.every((_, sourceIndex) => {
            const b = baseNodes[sourceIndex];
            const s = secNodes[sourceIndex];
            return (
                b.length === s.length &&
                b.every(
                    (node, nodeIndex) =>
                        node.getDescriptor() === s[nodeIndex]?.getDescriptor(),
                )
            );
        });
        if (!aligned) continue;

        for (
            let sourceIndex = 0;
            sourceIndex < baseSources.length;
            sourceIndex++
        )
            collectPairEdits(
                baseSources[sourceIndex],
                baseNodes[sourceIndex],
                baseGraphemes[sourceIndex],
                secSources[sourceIndex],
                secNodes[sourceIndex],
                base.locale,
                secondary.locale,
                index + 1,
                editsBySource[sourceIndex],
                (at) => {
                    const key = `${sourceIndex}:${at}`;
                    if (tagged.has(key)) return false;
                    tagged.add(key);
                    return true;
                },
                namesOn,
            );
        kept.push(secondary);
    }

    // Splice last-first in grapheme space; equal positions keep the base tag
    // (order 0) leftmost and secondaries in chosen order after it, because a
    // later splice at the same position lands before earlier-spliced text.
    const sources = base.project.sources.map((source, sourceIndex) => {
        const edits = editsBySource[sourceIndex];
        if (edits.length === 0) return source;
        const graphemes = [...baseGraphemes[sourceIndex]];
        for (const edit of [...edits].sort(
            (a, b) => b.at - a.at || b.order - a.order,
        ))
            graphemes.splice(edit.at, 0, edit.text);
        return { ...source, code: graphemes.join('') };
    });

    return {
        ...base.project,
        id,
        name: compositeName([base, ...kept], base.project.name),
        sources,
        // Exactly the locales that composited, base (primary) first: the
        // declared list is the sole determinant of the project's basis, and a
        // remix snapshots it.
        locales: [base.locale, ...kept.map((input) => input.locale)],
    };
}

/** Collect the edits one aligned source pair contributes. */
function collectPairEdits(
    baseSource: Source,
    baseNodes: Node[],
    baseGraphemes: string[],
    secSource: Source,
    secNodes: Node[],
    baseLocale: string,
    secLocale: string,
    order: number,
    edits: Edit[],
    /** Claim a base-tag insertion at a position; false if already claimed. */
    claimTag: (at: number) => boolean,
    namesOn: Map<Node, Set<string>>,
) {
    const secGraphemes = [...secSource.code.getGraphemes()];
    const slice = (
        graphemes: string[],
        from: number | undefined,
        to: number | undefined,
    ): string | undefined =>
        from === undefined || to === undefined
            ? undefined
            : graphemes.slice(from, to).join('');

    for (let index = 0; index < baseNodes.length; index++) {
        const bNode = baseNodes[index];
        const sNode = secNodes[index];

        if (bNode instanceof Names && sNode instanceof Names) {
            const bName = bNode.names.find((name) => !name.hasLanguage());
            const sName = sNode.names.find((name) => !name.hasLanguage());
            if (bName === undefined || sName === undefined) continue;
            // The name token's own span, not the Name node's — a non-final
            // name's node includes its separator comma.
            const bText = slice(
                baseGraphemes,
                baseSource.getTokenTextPosition(bName.name),
                baseSource.getTokenLastPosition(bName.name),
            );
            const sText = slice(
                secGraphemes,
                secSource.getTokenTextPosition(sName.name),
                secSource.getTokenLastPosition(sName.name),
            );
            // An identical word (an untranslated or symbolic name) needs no
            // tag and no append; it reads the same in both languages.
            if (bText === undefined || sText === undefined || bText === sText)
                continue;
            const present =
                namesOn.get(bNode) ??
                new Set(
                    bNode.names
                        .map((name) => name.getName())
                        .filter((name): name is string => name !== undefined),
                );
            namesOn.set(bNode, present);
            if (present.has(sText)) continue;
            const tagAt = baseSource.getTokenLastPosition(bName.name);
            const endAt = endOfNode(baseSource, bNode);
            if (tagAt === undefined || endAt === undefined) continue;
            if (claimTag(tagAt))
                edits.push({ at: tagAt, order: 0, text: `/${baseLocale}` });
            edits.push({ at: endAt, order, text: `,${sText}/${secLocale}` });
            present.add(sText);
        } else if (
            (bNode instanceof TextLiteral && sNode instanceof TextLiteral) ||
            (bNode instanceof Docs && sNode instanceof Docs) ||
            (bNode instanceof FormattedLiteral &&
                sNode instanceof FormattedLiteral)
        ) {
            const bOption = optionsOf(bNode).find(
                (option) => option.language === undefined,
            );
            const sOption = optionsOf(sNode).find(
                (option) => option.language === undefined,
            );
            if (bOption === undefined || sOption === undefined) continue;
            // A tag goes after the close delimiter; an unclosed literal (one
            // en-US example ships one) can't take one, so leave it whole.
            if (bOption.close === undefined || sOption.close === undefined)
                continue;
            const bText = slice(
                baseGraphemes,
                startOfNode(baseSource, bOption),
                baseSource.getTokenLastPosition(bOption.close),
            );
            const sText = slice(
                secGraphemes,
                startOfNode(secSource, sOption),
                secSource.getTokenLastPosition(sOption.close),
            );
            if (bText === undefined || sText === undefined || bText === sText)
                continue;
            const tagAt = baseSource.getTokenLastPosition(bOption.close);
            const endAt = endOfNode(baseSource, bNode);
            if (tagAt === undefined || endAt === undefined) continue;
            if (claimTag(tagAt))
                edits.push({ at: tagAt, order: 0, text: `/${baseLocale}` });
            edits.push({
                at: endAt,
                order,
                // Adjacent text options form one literal ("series of
                // Translations lacking separating space"); doc options need
                // whitespace between them or the two `¶` merge.
                text:
                    (bNode instanceof Docs ? '\n' : '') +
                    sText +
                    `/${secLocale}`,
            });
        }
    }
}

/**
 * A multilingual name line naming the composite in each of its locales,
 * all-tagged so `parseAsMultilingualName` accepts it; the base's raw name when
 * that can't be built.
 */
function compositeName(inputs: CompositeInput[], fallback: string): string {
    const options: string[] = [];
    const seen = new Set<string>();
    for (const input of inputs) {
        const name = ownName(input);
        if (name.length === 0 || seen.has(name)) continue;
        seen.add(name);
        const delimiter = !name.includes('"')
            ? '"'
            : !name.includes("'")
              ? "'"
              : undefined;
        if (delimiter === undefined) return fallback;
        options.push(`${delimiter}${name}${delimiter}/${input.locale}`);
    }
    const joined = options.join('');
    return parseAsMultilingualName(joined) !== undefined ? joined : fallback;
}

/** An input's name in its own language: a per-locale file's name is a bare
 *  string, while the master's may be a multilingual literal to pick from. */
function ownName(input: CompositeInput): string {
    const parsed = parseAsMultilingualName(input.project.name);
    if (parsed === undefined) return input.project.name;
    const language = input.locale.split('-')[0];
    const option =
        parsed.texts.find((text) => text.getLanguage() === language) ??
        parsed.texts.find((text) => text.getLanguage() === 'en') ??
        parsed.texts[0];
    const name = option?.getText() ?? '';
    return name.length > 0 ? name : input.project.name;
}
