/**
 * Reads rendered text aloud and highlights it as it goes (#1015).
 *
 * Dynamically imported by `ReadAloud.svelte`, since the bubbles that offer it
 * are on nearly every page and nothing here is needed until someone asks.
 * Speech goes through the app's one synthesizer (`speech.ts`) under its own
 * source, so reading never cuts off a stage's `Say`, and one reading replaces
 * another rather than talking over it.
 */

import speech, {
    ReadAloudSource,
    speakingBoundary,
    speakingNow,
} from '#output/Speech/speech.ts';
import { clampRate, type Utterance } from '#output/Speech/speechQueue.ts';
import {
    getKeywordWords,
    getSymKey,
    locateWord,
    toChunks,
    type Piece,
    type Place,
    type ReadingChunk,
} from '#components/speech/reading.ts';
import type { KeywordId } from '#parser/Keywords.ts';
import { writable, type Readable } from 'svelte/store';

/**
 * Content that is not the text being read: other languages' echoes (only
 * the primary is read), the symbol under a concept link's name, anything
 * hidden from assistive technology, placeholders, controls, and an example's
 * tools and output, which have their own labels.
 */
const Skip = [
    '[aria-hidden="true"]',
    '.secondary',
    '.secondary-inline',
    '.dialog-echo',
    'sub',
    '.rich-loading',
    'button:not(.conceptlink):not(.term)',
    'input',
    'textarea',
    'select',
    'svg',
    'style',
    'script',
    '.example .tools',
    '.example .value',
].join(', ');

/** Containers whose only words are their code tokens. */
const Code = '.root, .example';

/** What a span of reading points at: a run of prose, or a code token. */
type Content = Text | Element;

/** Elements whose edges end one utterance and begin the next. */
const Blocks = new Set([
    'P',
    'LI',
    'UL',
    'OL',
    'DIV',
    'H1',
    'H2',
    'H3',
    'H4',
    'H5',
    'H6',
    'BLOCKQUOTE',
    'TABLE',
    'TR',
]);

function languageOf(node: Content): string {
    const element = node instanceof Element ? node : node.parentElement;
    return (
        element?.closest('[lang]')?.getAttribute('lang') ??
        document.documentElement.lang
    );
}

/** The rendered content of `roots`, in reading order. */
function collect(roots: readonly Element[]): Piece<Content>[] {
    const pieces: Piece<Content>[] = [];
    // Each code container is one example, numbered across all the roots.
    let examples = 0;
    function visit(node: ChildNode | Element, example: number | undefined) {
        if (node instanceof Text) {
            // Inside code, the spacing between tokens is layout, not words.
            if (example === undefined && node.data.length > 0)
                pieces.push({
                    kind: 'text',
                    text: node.data,
                    lang: languageOf(node),
                    target: node,
                });
            return;
        }
        if (!(node instanceof Element) || node.matches(Skip)) return;
        if (node.classList.contains('token-view')) {
            const category = [...node.classList]
                .find((name) => name.startsWith('token-category-'))
                ?.slice('token-category-'.length);
            const text = node.textContent ?? '';
            pieces.push({
                kind: 'token',
                text,
                category,
                example: example ?? examples++,
                sym: getSymKey(text),
                lang: languageOf(node),
                target: node,
            });
            return;
        }
        // Code is read as one utterance of its tokens: its lines and blocks
        // are layout, and the rest of its text (line numbers, fold toggles)
        // belongs to the editor rather than the program.
        const block = example === undefined && Blocks.has(node.tagName);
        if (block) pieces.push({ kind: 'break' });
        const inner = example ?? (node.matches(Code) ? examples++ : undefined);
        for (const child of node.childNodes) visit(child, inner);
        if (block) pieces.push({ kind: 'break' });
    }
    for (const root of roots) {
        visit(root, undefined);
        pieces.push({ kind: 'break' });
    }
    return pieces;
}

function toBoundary(
    range: Range,
    place: Place<Content>,
    edge: 'start' | 'end',
) {
    if (place.whole) {
        if (edge === 'start') range.setStartBefore(place.target);
        else range.setEndAfter(place.target);
    } else if (edge === 'start') range.setStart(place.target, place.offset);
    else range.setEnd(place.target, place.offset);
}

function chunkRange(chunk: ReadingChunk<Content>): Range | undefined {
    const first = chunk.spans[0];
    const last = chunk.spans.at(-1);
    if (first === undefined || last === undefined) return undefined;
    if (!first.target.isConnected || !last.target.isConnected) return undefined;
    const range = document.createRange();
    toBoundary(range, first, 'start');
    toBoundary(
        range,
        { ...last, offset: last.offset + last.end - last.start },
        'end',
    );
    return range;
}

const ChunkHighlight = 'read-aloud-chunk';
const WordHighlight = 'read-aloud-word';

/** One highlight per name, kept for the page's life; see `highlight`. */
const highlights = new Map<string, Highlight>();

/**
 * Move a highlight to `range`, or clear it. Feature-detected: without the
 * Highlight API, reading is still heard. A highlight is changed in place
 * rather than replaced, because WebKit repaints a range only when it leaves
 * its `Highlight`: replacing the registry entry, or deleting it, left every
 * word already read painted until something else repainted it.
 */
function highlight(name: string, range: Range | undefined) {
    if (typeof CSS === 'undefined' || !('highlights' in CSS)) return;
    if (typeof Highlight === 'undefined') return;
    let current = highlights.get(name);
    if (current === undefined) {
        current = new Highlight();
        highlights.set(name, current);
    }
    current.clear();
    if (range === undefined) {
        CSS.highlights.delete(name);
        return;
    }
    current.add(range);
    if (CSS.highlights.get(name) !== current) CSS.highlights.set(name, current);
}

/** The reading in progress, if any; there is only one voice to read with. */
let active: { finish: () => void } | undefined = undefined;

const reading = writable<readonly Element[]>([]);

/** What is being read, so each button can show whether its text is, however
 *  the reading began: its own press, or the tutorial reading a new line. */
export const nowReading: Readable<readonly Element[]> = {
    subscribe: reading.subscribe,
};

/** Stop whatever is being read. */
export function stop() {
    active?.finish();
}

export type ReadOptions = {
    /** The words the locale's keywords are read as. */
    keywords: Partial<Record<KeywordId, string>>;
    /** What each kind of token is called, for naming a lone symbol. */
    names: Partial<Record<string, string>>;
    /** How fast to read; 1 is the voice's own pace. */
    rate: number;
    /** The viewer's chosen voice, if any. */
    voice: string | undefined;
};

/**
 * Read `roots` aloud, in order, replacing any reading already underway.
 */
export function read(roots: readonly Element[], options: ReadOptions) {
    active?.finish();

    const chunks = toChunks(collect(roots), {
        keywords: getKeywordWords(options.keywords),
        names: options.names,
    });

    let started = false;
    let done = false;
    /** The passage being read, so a word's move can repaint it; see below. */
    let passage: Range | undefined = undefined;
    const unsubscribers: (() => void)[] = [];
    function finish() {
        if (done) return;
        done = true;
        for (const unsubscribe of unsubscribers) unsubscribe();
        highlight(ChunkHighlight, undefined);
        highlight(WordHighlight, undefined);
        if (active === current) {
            active = undefined;
            reading.set([]);
        }
    }
    function cancel() {
        if (done) return;
        speech.cancel(ReadAloudSource);
        finish();
    }
    const current = { finish: cancel };
    active = current;
    reading.set(roots);

    if (chunks.length === 0) {
        finish();
        return;
    }

    unsubscribers.push(
        speakingNow.subscribe((now) => {
            if (now?.source === ReadAloudSource && now.mark !== undefined) {
                started = true;
                const chunk = chunks[now.mark];
                const range = chunk ? chunkRange(chunk) : undefined;
                // The text went away, most likely because the tutorial moved
                // on, so there is nothing left to read along with.
                if (range === undefined) cancel();
                else {
                    passage = range;
                    highlight(ChunkHighlight, range);
                    highlight(WordHighlight, undefined);
                }
            } else if (started) {
                // A music's spoken line may cut in and ours resumes after it,
                // so only silence means the reading is over.
                if (now === undefined) finish();
                else {
                    highlight(ChunkHighlight, undefined);
                    highlight(WordHighlight, undefined);
                }
            }
        }),
        speakingBoundary.subscribe((reached) => {
            if (reached?.source !== ReadAloudSource) return;
            // Safari repaints a word that leaves its highlight only within the
            // line box, leaving a strip of gold below it; re-applying the
            // passage repaints the whole passage, strips included.
            if (passage !== undefined)
                highlight(ChunkHighlight, passage.cloneRange());
            const chunk =
                reached.mark === undefined ? undefined : chunks[reached.mark];
            const word = chunk
                ? locateWord(chunk, reached.index, reached.length)
                : undefined;
            if (
                word === undefined ||
                !word.start.target.isConnected ||
                !word.end.target.isConnected
            )
                return highlight(WordHighlight, undefined);
            const range = document.createRange();
            toBoundary(range, word.start, 'start');
            toBoundary(range, word.end, 'end');
            highlight(WordHighlight, range);
        }),
    );

    speech.prefer(options.voice);
    speech.speak(
        ReadAloudSource,
        chunks.map((chunk, index): Utterance => ({
            source: ReadAloudSource,
            text: chunk.text,
            lang: chunk.lang,
            rate: clampRate(options.rate),
            volume: 1,
            priority: 'flow',
            // The words are already on screen, highlighted as they're read.
            captioned: false,
            mark: index,
        })),
    );
}

/** Unlock synthesis inside the gesture that asked for it; iOS requires it. */
export function prime() {
    speech.prime();
}

/** Whether this browser can speak at all. */
export function canRead() {
    return speech.supported();
}
