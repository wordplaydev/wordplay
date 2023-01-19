export default function parseRichText(text: string): RichNode {
    return new RichNode(parseNodes(text.split('')));
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
        return '_';
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
        return '*';
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
        return '**';
    }
    getHTMLOpenMarker() {
        return '<strong>';
    }
    getHTMLCloseMarker() {
        return '</strong>';
    }
    getWeight(): undefined | number {
        return 500;
    }
}

class ExtraBoldNode extends Node {
    constructor(children: Node[]) {
        super(children);
    }

    getRichTextMarker() {
        return '***';
    }
    getHTMLOpenMarker() {
        return "<span class='extra'>";
    }
    getHTMLCloseMarker() {
        return '</span>';
    }
    getWeight(): undefined | number {
        return 700;
    }
}

class ItalicNode extends Node {
    constructor(children: Node[]) {
        super(children);
    }

    getRichTextMarker() {
        return '/';
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
        const nextNext = symbols[1];
        const nextNextNext = symbols[2];
        if (next === '*') {
            if (nextNext === '*') {
                if (nextNextNext === '*') children.push(parseExtra(symbols));
                else children.push(parseBold(symbols));
            } else children.push(parseLight(symbols));
        } else if (next === '_') children.push(parseUnderline(symbols));
        else if (next === '/') children.push(parseItalic(symbols));
        else {
            let symbol = symbols[0];
            let text = '';
            while (
                symbols.length > 0 &&
                symbol !== '*' &&
                symbol !== '/' &&
                symbol !== '_'
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
    const nodes = parseNodes(symbols, '/');
    symbols.shift();
    return new ItalicNode(nodes);
}

function parseUnderline(symbols: string[]): UnderlineNode {
    symbols.shift();
    const nodes = parseNodes(symbols, '_');
    symbols.shift();
    return new UnderlineNode(nodes);
}

function parseLight(symbols: string[]): LightNode {
    symbols.shift();
    const nodes = parseNodes(symbols, '*');
    symbols.shift();
    return new LightNode(nodes);
}

function parseBold(symbols: string[]): BoldNode {
    symbols.shift();
    symbols.shift();
    const nodes = parseNodes(symbols, '**');
    symbols.shift();
    symbols.shift();
    return new BoldNode(nodes);
}

function parseExtra(symbols: string[]): ExtraBoldNode {
    symbols.shift();
    symbols.shift();
    symbols.shift();
    const nodes = parseNodes(symbols, '***');
    symbols.shift();
    symbols.shift();
    symbols.shift();
    return new ExtraBoldNode(nodes);
}
