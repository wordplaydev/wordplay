/**
 * What read aloud says, and where on the page each part of it is (#1015).
 *
 * Pure over an abstract list of pieces so it can be tested without a DOM;
 * `readAloud.ts` walks the page to produce the pieces and turns the spans
 * back into ranges to highlight. It reads what is *rendered* rather than the
 * markup it came from, because the page already has what a reader sees:
 * localized concept names, glossary words, and terms substituted.
 */

import { KeywordIds, Keywords } from '@parser/Keywords';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import type { KeywordId } from '@parser/Keywords';
import Sym from '@nodes/Sym';
import { tokens } from '@parser/Tokenizer';

/** One run of rendered content, in reading order. */
export type Piece<Target> =
    /** Prose, read as it is written. */
    | { kind: 'text'; text: string; lang: string; target: Target }
    /** One code token, read by `speakToken` and highlighted whole. */
    | {
          kind: 'token';
          text: string;
          category: string | undefined;
          /** Which example it belongs to, so an example can be read as a whole. */
          example: number;
          /** Its `Sym` key, for naming the symbol; see `getSymKey`. */
          sym: string | undefined;
          lang: string;
          target: Target;
      }
    /** The edge of a block: what follows is a separate utterance. */
    | { kind: 'break' };

/**
 * A stretch of an utterance's text and the content it came from. `whole`
 * spans stand for a token, whose spoken words don't match its glyphs, so any
 * word inside one highlights the entire token.
 */
export type Span<Target> = {
    start: number;
    end: number;
    target: Target;
    /** Where this span begins within the target's own text. */
    offset: number;
    whole: boolean;
};

/** One utterance: a block of prose or code in one language. */
export type ReadingChunk<Target> = {
    text: string;
    lang: string;
    spans: Span<Target>[];
};

/** Token categories that are structure rather than content, so are silent. */
const SilentCategories = new Set([
    'delimiter',
    'relation',
    'docs',
    'end',
    'placeholder',
]);

/** Anything a voice can say: a letter, a digit, or an emoji it will name. */
const Sayable = /[\p{L}\p{N}\p{Extended_Pictographic}]/u;

/**
 * The words for each code keyword glyph in a locale, so `ƒ` is read as
 * "function" rather than skipped or spelled out. The first keyword to claim
 * a glyph wins, which gives `?` its expression reading ("then").
 */
export function getKeywordWords(
    words: Partial<Record<KeywordId, string>>,
): Map<string, string> {
    const map = new Map<string, string>();
    for (const id of KeywordIds) {
        const spec = Keywords[id];
        const word = words[id];
        if (spec.context !== 'code' || word === undefined) continue;
        const bare = withoutAnnotations(word).trim();
        if (bare.length > 0 && !map.has(spec.symbol))
            map.set(spec.symbol, bare);
    }
    return map;
}

/**
 * How one code token is read: a keyword as its word, an operator as itself
 * (voices already say "plus"), structure as nothing, and everything else as
 * written. Reading code this way rather than describing it is deliberate:
 * a description can't be highlighted against the code it describes.
 */
export function speakToken(
    text: string,
    category: string | undefined,
    keywords: Map<string, string>,
): string {
    const trimmed = text.trim();
    if (trimmed.length === 0) return '';
    const word = keywords.get(trimmed);
    if (word !== undefined) return word;
    if (category !== undefined && SilentCategories.has(category)) return '';
    if (category === 'operator') return trimmed;
    return Sayable.test(trimmed) ? trimmed : '';
}

/** What read aloud needs from the reader's locale. */
export type ReadingWords = {
    /** Keyword glyphs to their words; see `getKeywordWords`. */
    keywords: Map<string, string>;
    /** `Sym` keys to what that kind of token is, e.g. `ListOpen` to "list open". */
    names: Partial<Record<string, string>>;
};

/** Keywords whose glyph is a value, so read as that value even alone. */
const ValueKeywords: KeywordId[] = ['true', 'false', 'none'];
const ValueGlyphs = new Set(ValueKeywords.map((id) => Keywords[id].symbol));

/**
 * `Sym` keys that belong to markup or patterns. A few `Sym` values are shared
 * between contexts (`_`, `/`, `^`), and a code token must not be named as the
 * markup that happens to share its glyph.
 */
const NotCode = new Set([
    'Formatted',
    'Words',
    'Link',
    'Italic',
    'Underline',
    'Light',
    'Bold',
    'Extra',
    'Concept',
    'URL',
    'Mention',
    'Code',
    'Highlight',
    'Defect',
    'ExternalExample',
]);

/**
 * The `Sym` key of the first token in `text`, for naming it. A glyph that
 * lexes several ways (`?` is a conditional and a boolean type) is named as the
 * first keyword claiming it, the same reading `getKeywordWords` chooses.
 */
export function getSymKey(text: string): string | undefined {
    const trimmed = text.trim();
    const keyword = KeywordIds.map((id) => Keywords[id]).find(
        (spec) => spec.context === 'code' && spec.symbol === trimmed,
    );
    const types = [
        ...(keyword?.types ?? []),
        ...(tokens(trimmed)[0]?.types ?? []),
    ];
    for (const type of types)
        for (const [key, value] of Object.entries(Sym))
            if (
                value === type &&
                !NotCode.has(key) &&
                !key.startsWith('Pattern')
            )
                return key;
    return undefined;
}

/**
 * How a token is read when an example is about its symbols, as in "then a
 * \?\": by what kind of token it is ("conditional"), since its usual reading
 * is either nothing or a keyword word ("then") that says something else.
 * A value keeps its word, and names, numbers and operators read as usual.
 */
export function nameToken(
    text: string,
    category: string | undefined,
    sym: string | undefined,
    words: ReadingWords,
): string {
    const usual = speakToken(text, category, words.keywords);
    const trimmed = text.trim();
    const keyword = words.keywords.has(trimmed);
    if (usual.length > 0 && (!keyword || ValueGlyphs.has(trimmed)))
        return usual;
    const name = sym === undefined ? undefined : words.names[sym];
    return name === undefined ? usual : withoutAnnotations(name).trim();
}

/** Each whitespace character as one space, so offsets stay one to one. */
function spaced(text: string): string {
    return text.replace(/\s/gu, ' ');
}

/** Group pieces into utterances: a new one at every block edge and every
 *  change of language, since an utterance is spoken in one voice. */
export function toChunks<Target>(
    pieces: readonly Piece<Target>[],
    words: ReadingWords,
): ReadingChunk<Target>[] {
    // An example is about its symbols when it is a single token, or when all
    // of it would otherwise be silent, as `{}` is.
    const examples = new Map<number, string[]>();
    for (const piece of pieces)
        if (piece.kind === 'token')
            examples.set(piece.example, [
                ...(examples.get(piece.example) ?? []),
                speakToken(piece.text, piece.category, words.keywords),
            ]);
    const aboutSymbols = new Set(
        [...examples]
            .filter(
                ([, spoken]) =>
                    spoken.length === 1 ||
                    spoken.every((word) => word.length === 0),
            )
            .map(([example]) => example),
    );

    const chunks: ReadingChunk<Target>[] = [];
    let current: ReadingChunk<Target> | undefined = undefined;

    function finish() {
        if (current !== undefined && current.text.trim().length > 0)
            chunks.push(current);
        current = undefined;
    }

    for (const piece of pieces) {
        if (piece.kind === 'break') {
            finish();
            continue;
        }
        const said =
            piece.kind === 'text'
                ? spaced(piece.text)
                : aboutSymbols.has(piece.example)
                  ? nameToken(piece.text, piece.category, piece.sym, words)
                  : speakToken(piece.text, piece.category, words.keywords);
        if (said.length === 0) continue;
        if (current !== undefined && current.lang !== piece.lang) finish();
        const chunk: ReadingChunk<Target> = current ?? {
            text: '',
            lang: piece.lang,
            spans: [],
        };
        current = chunk;
        // A token carries no spacing of its own, so it's kept apart from its
        // neighbors, or "Phrase" and "hi" would be read as one word.
        if (
            piece.kind === 'token' &&
            chunk.text.length > 0 &&
            !chunk.text.endsWith(' ')
        )
            chunk.text += ' ';
        const start = chunk.text.length;
        chunk.text += said;
        chunk.spans.push({
            start,
            end: chunk.text.length,
            target: piece.target,
            offset: 0,
            whole: piece.kind === 'token',
        });
        if (piece.kind === 'token') chunk.text += ' ';
    }
    finish();
    return chunks;
}

/** A position in the content, resolved from a position in an utterance. */
export type Place<Target> = {
    target: Target;
    /** Offset within the target's text; ignored when `whole`. */
    offset: number;
    whole: boolean;
};

/** Where a word starts and ends, given a boundary the voice reported. */
export function locateWord<Target>(
    chunk: ReadingChunk<Target>,
    index: number,
    length: number | undefined,
): { start: Place<Target>; end: Place<Target> } | undefined {
    // Engines that report no length leave the word's end to us.
    let end = index + (length ?? 0);
    if (length === undefined) {
        const next = chunk.text.slice(index).search(/\s/u);
        end = next < 0 ? chunk.text.length : index + next;
    }
    if (end <= index) return undefined;

    // A boundary between spans lands on the span that follows it.
    const first = chunk.spans.find((span) => span.end > index);
    const last = [...chunk.spans].reverse().find((span) => span.start < end);
    if (first === undefined || last === undefined) return undefined;
    return {
        start: {
            target: first.target,
            offset: first.offset + Math.max(0, index - first.start),
            whole: first.whole,
        },
        end: {
            target: last.target,
            offset: last.offset + Math.min(last.end, end) - last.start,
            whole: last.whole,
        },
    };
}
