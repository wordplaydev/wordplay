import {
    BOLD_SYMBOL,
    EXTRA_SYMBOL,
    ITALIC_SYMBOL,
    LIGHT_SYMBOL,
    UNDERSCORE_SYMBOL,
} from '../parser/Symbols';

export default function parseRichText(text: string): RichNode {
    const paragraphs = text.split(/\s*\n\n\s*/);
    // First, split into paragraphs.
    return paragraphs.length > 1
        ? new RichNode(
              paragraphs.map(
                  (content) =>
                      new ParagraphNode(parseNodes(content.trim().split('')))
              )
          )
        : new RichNode(parseNodes(text.split('')));
}

type CSSFormat = { italic: boolean; weight: undefined | number };

abstract class Node {
    readonly children: Node[];

    constructor(children: Node[]) {
        this.children = [...children];
    }

    abstract getRichTextMarker(): string;
    abstract getHTMLOpenMarker(): string;
    abstract getHTMLCloseMarker(): string;

    getWeight(): undefined | number {
        return undefined;
    }

    toString(): string {
        return `${this.getRichTextMarker()}${this.children
            .map((child) => child.toString())
            .join('')}${this.getRichTextMarker()}`;
    }
    toHTML(): string {
        return `${this.getHTMLOpenMarker()}${this.children
            .map((child) => child.toHTML())
            .join('')}${this.getHTMLCloseMarker()}`;
    }

    getTextFormats() {
        const formats = new Map<TextNode, CSSFormat>();
        this.gatherTextFormats(formats);
        return formats;
    }

    gatherTextFormats(formats: Map<TextNode, CSSFormat>, parents: Node[] = []) {
        parents.unshift(this);
        for (const child of this.children)
            child.gatherTextFormats(formats, parents);
        parents.shift();
    }
}

export class RichNode extends Node {
    constructor(children: Node[]) {
        super(children);
    }
    getRichTextMarker() {
        return '';
    }
    getHTMLOpenMarker() {
        return '';
    }
    getHTMLCloseMarker() {
        return '';
    }
}

export class ParagraphNode extends Node {
    constructor(children: Node[]) {
        super(children);
    }
    getRichTextMarker() {
        return '';
    }
    getHTMLOpenMarker() {
        return '<p>';
    }
    getHTMLCloseMarker() {
        return '</p>';
    }
}

export class TextNode extends Node {
    readonly text: string;
    constructor(text: string) {
        super([]);
        this.text = text;
    }
    toString() {
        return this.text;
    }
    toHTML() {
        return this.text;
    }
    getRichTextMarker() {
        return '';
    }
    getHTMLOpenMarker() {
        return '';
    }
    getHTMLCloseMarker() {
        return '';
    }

    gatherTextFormats(formats: Map<TextNode, CSSFormat>, parents: Node[]) {
        formats.set(this, {
            italic: parents.some((p) => p instanceof ItalicNode),
            weight: parents
                .find((p) => p.getWeight() !== undefined)
                ?.getWeight(),
        });
    }
}

class UnderlineNode extends Node {
    constructor(children: Node[]) {
        super(children);
    }
    getRichTextMarker() {
        return UNDERSCORE_SYMBOL;
    }
    getHTMLOpenMarker() {
        return '<u>';
    }
    getHTMLCloseMarker() {
        return '</u>';
    }
}

class LightNode extends Node {
    constructor(children: Node[]) {
        super(children);
    }
    getRichTextMarker() {
        return LIGHT_SYMBOL;
    }
    getHTMLOpenMarker() {
        return "<span class='light'>";
    }
    getHTMLCloseMarker() {
        return '</span>';
    }
    getWeight(): undefined | number {
        return 300;
    }
}

class BoldNode extends Node {
    constructor(children: Node[]) {
        super(children);
    }

    getRichTextMarker() {
        return BOLD_SYMBOL;
    }
    getHTMLOpenMarker() {
        return '<strong>';
    }
    getHTMLCloseMarker() {
        return '</strong>';
    }
    getWeight(): undefined | number {
        return 700;
    }
}

class ExtraBoldNode extends Node {
    constructor(children: Node[]) {
        super(children);
    }

    getRichTextMarker() {
        return EXTRA_SYMBOL;
    }
    getHTMLOpenMarker() {
        return "<span class='extra'>";
    }
    getHTMLCloseMarker() {
        return '</span>';
    }
    getWeight(): undefined | number {
        return 900;
    }
}

class ItalicNode extends Node {
    constructor(children: Node[]) {
        super(children);
    }

    getRichTextMarker() {
        return ITALIC_SYMBOL;
    }
    getHTMLOpenMarker() {
        return '<em>';
    }
    getHTMLCloseMarker() {
        return '</em>';
    }
}

// This should be Unicode safe because we're only manipulating a fixed set of ASCII characters.
function parseNodes(symbols: string[], awaiting?: string): Node[] {
    const children: Node[] = [];
    // Stop when we run out of symbols or we reach a sequence the caller is awaiting.
    while (
        symbols.length > 0 &&
        (awaiting === undefined || !symbols.join('').startsWith(awaiting))
    ) {
        const next = symbols[0];
        const repeated = next === symbols[1];
        if (next === LIGHT_SYMBOL && !repeated)
            children.push(parseLight(symbols));
        else if (next === BOLD_SYMBOL && !repeated)
            children.push(parseBold(symbols));
        else if (next === EXTRA_SYMBOL && !repeated)
            children.push(parseExtra(symbols));
        else if (next === UNDERSCORE_SYMBOL && !repeated)
            children.push(parseUnderline(symbols));
        else if (next === ITALIC_SYMBOL && !repeated)
            children.push(parseItalic(symbols));
        else if (
            repeated &&
            (next === LIGHT_SYMBOL ||
                next === BOLD_SYMBOL ||
                next === EXTRA_SYMBOL ||
                next === UNDERSCORE_SYMBOL ||
                next === ITALIC_SYMBOL)
        ) {
            children.push(new TextNode(next));
            symbols.shift();
            symbols.shift();
        } else {
            let symbol = symbols[0];
            let text = '';
            while (
                symbols.length > 0 &&
                symbol !== EXTRA_SYMBOL &&
                symbol !== BOLD_SYMBOL &&
                symbol !== LIGHT_SYMBOL &&
                symbol !== ITALIC_SYMBOL &&
                symbol !== UNDERSCORE_SYMBOL
            ) {
                text += symbols.shift();
                symbol = symbols[0];
            }
            if (text.length > 0) children.push(new TextNode(text));
        }
    }
    return children;
}

function parseItalic(symbols: string[]): ItalicNode {
    symbols.shift();
    const nodes = parseNodes(symbols, ITALIC_SYMBOL);
    symbols.shift();
    return new ItalicNode(nodes);
}

function parseUnderline(symbols: string[]): UnderlineNode {
    symbols.shift();
    const nodes = parseNodes(symbols, UNDERSCORE_SYMBOL);
    symbols.shift();
    return new UnderlineNode(nodes);
}

function parseLight(symbols: string[]): LightNode {
    symbols.shift();
    const nodes = parseNodes(symbols, LIGHT_SYMBOL);
    symbols.shift();
    return new LightNode(nodes);
}

function parseBold(symbols: string[]): BoldNode {
    symbols.shift();
    const nodes = parseNodes(symbols, BOLD_SYMBOL);
    symbols.shift();
    return new BoldNode(nodes);
}

function parseExtra(symbols: string[]): ExtraBoldNode {
    symbols.shift();
    const nodes = parseNodes(symbols, EXTRA_SYMBOL);
    symbols.shift();
    return new ExtraBoldNode(nodes);
}
