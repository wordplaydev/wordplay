import Branch from '../nodes/Branch';
import ConceptLink from '../nodes/ConceptLink';
import Example from '../nodes/Example';
import Markup from '../nodes/Markup';
import Mention from '../nodes/Mention';
import type { Segment } from '../nodes/Paragraph';
import Paragraph from '../nodes/Paragraph';
import { Sym } from '../nodes/Sym';
import Token from '../nodes/Token';
import WebLink from '../nodes/WebLink';
import Words from '../nodes/Words';
import parseProgram from './parseProgram';
import { BULLET_SYMBOL, HIGHLIGHT_SYMBOL } from './Symbols';
import type Tokens from './Tokens';

export default function parseMarkup(tokens: Tokens): Markup {
    const content: Paragraph[] = [];
    tokens.whileDo(
        () =>
            tokens.hasNext() &&
            tokens.nextIsnt(Sym.Doc) &&
            nextIsContent(tokens),
        () => content.push(parseParagraph(tokens)),
    );
    return new Markup(content, tokens.getSpaces());
}

export function parseParagraph(tokens: Tokens): Paragraph {
    const content: Segment[] = [];

    // Read until hitting two newlines or a closing doc symbol.
    // Stop the paragraph if the content we just parsed has a Words with two or more line breaks.
    tokens.whileDo(
        () =>
            tokens.hasNext() &&
            tokens.nextIsnt(Sym.Doc) &&
            nextIsContent(tokens),
        () => {
            content.push(parseSegment(tokens));
            if (tokens.nextHasMoreThanOneLineBreak()) return false;
        },
    );

    return new Paragraph(content);
}

function parseSegment(tokens: Tokens) {
    return tokens.nextIs(Sym.TagOpen)
        ? parseWebLink(tokens)
        : tokens.nextIs(Sym.Concept)
            ? parseConceptLink(tokens)
            : tokens.nextIs(Sym.Code)
                ? parseExample(tokens)
                : tokens.nextIs(Sym.Mention)
                    ? parseMention(tokens)
                    : parseWords(tokens);
}

function parseWebLink(tokens: Tokens): WebLink {
    const open = tokens.read(Sym.TagOpen);
    const description = tokens.readIf(Sym.Words);
    const at = tokens.readIf(Sym.Link);
    const url = tokens.read();
    const close = tokens.readIf(Sym.TagClose);

    return new WebLink(open, description, at, url, close);
}

function parseConceptLink(tokens: Tokens): ConceptLink {
    const concept = tokens.read(Sym.Concept);
    return new ConceptLink(concept);
}

const Formats = [
    Sym.Italic,
    Sym.Underline,
    Sym.Light,
    Sym.Bold,
    Sym.Extra,
] as const;
type FormatSym = (typeof Formats)[number];

function parseWords(tokens: Tokens): Words {
    // Read an optional format
    const open = tokens.nextIsOneOf(...Formats) ? tokens.read() : undefined;

    // Figure out what token type it is.
    let format: FormatSym | undefined = undefined;
    if (open !== undefined) {
        const hit = Formats.find((t) => open.types.includes(t));
        if (hit) format = hit;
    }

    // Read segments until reaching the matching closing format or the end of the paragraph or the end of the doc or there are no more tokens.
    const segments: Segment[] = [];
    tokens.whileDo(
        () =>
            tokens.hasNext() &&
            tokens.nextIsnt(Sym.Doc) &&
            (format === undefined || !tokens.nextIs(format)) &&
            nextIsContent(tokens),
        () => {
            segments.push(
                tokens.nextIs(Sym.Words)
                    ? tokens.read(Sym.Words)
                    : parseSegment(tokens),
            );
            if (tokens.nextHasMoreThanOneLineBreak()) return false;
            // Stop before a bullet on a new line so each bullet gets its own Words node,
            // allowing getBullets() to split them correctly even with single-newline separators.
            if (
                tokens.nextHasPrecedingLineBreak() === true &&
                tokens.peekText()?.startsWith(BULLET_SYMBOL)
            )
                return false;
        },
    );

    // Read closing format if it matches.
    const close = format && tokens.nextIs(format) ? tokens.read() : undefined;

    return new Words(open, segments, close);
}

export function parseExample(tokens: Tokens): Example {
    const open = tokens.read(Sym.Code);
    const program = parseProgram(tokens, true);
    const close = tokens.readIf(Sym.Code);

    let highlight: Token | undefined = undefined;
    if (close !== undefined && tokens.nextIs(Sym.Words)) {
        const text = tokens.peekText() ?? '';
        if (text.startsWith(HIGHLIGHT_SYMBOL) || text.startsWith('highlight')) {
            tokens.read(Sym.Words);
            const prefix = text.startsWith(HIGHLIGHT_SYMBOL)
                ? HIGHLIGHT_SYMBOL
                : 'highlight';
            highlight = new Token(HIGHLIGHT_SYMBOL, Sym.Highlight);
            const remaining = text.slice(prefix.length);
            if (remaining.length > 0) tokens.injectNext(new Token(remaining, Sym.Words));
        }
    }

    return new Example(open, program, close, highlight);
}

function parseMention(tokens: Tokens): Mention | Branch {
    const name = tokens.read();
    const mention = new Mention(name);

    if (tokens.nextIs(Sym.ListOpen)) return parseBranch(mention, tokens);
    else return mention;
}

function parseBranch(mention: Mention, tokens: Tokens): Branch {
    const open = tokens.read(Sym.ListOpen);
    const yes = parseWords(tokens);
    const bar = tokens.nextIs(Sym.Union) ? tokens.read(Sym.Union) : undefined;
    const no = parseWords(tokens);
    const close = tokens.nextIs(Sym.ListClose)
        ? tokens.read(Sym.ListClose)
        : undefined;
    return new Branch(mention, open, yes, bar, no, close);
}

function nextIsContent(tokens: Tokens) {
    return tokens.nextIsOneOf(
        Sym.Words,
        Sym.TagOpen,
        Sym.Concept,
        Sym.Code,
        Sym.Mention,
        Sym.Italic,
        Sym.Light,
        Sym.Bold,
        Sym.Underline,
        Sym.Extra,
    );
}
