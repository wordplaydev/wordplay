import Graphemer from 'graphemer';

// This silliness is due to Graphemer not behaving the same in browsers and in Node
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isConstructor(obj: any) {
    return !!obj.prototype && !!obj.prototype.constructor.name;
}

const Segmenter = isConstructor(Graphemer)
    ? new Graphemer()
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (new (Graphemer as any).default() as Graphemer);

export default class UnicodeString {
    readonly text: string;

    /* A cache of grapheme segments in the given string, crucial for reasoning about visible characters. */
    _segments: string[] | undefined = undefined;

    constructor(text: string) {
        // Ensure text is comparable.
        this.text = text.normalize();
    }

    getGraphemes() {
        if (this._segments === undefined)
            this._segments = [
                ...Array.from(Segmenter.splitGraphemes(this.text)).map(
                    (s) => s
                ),
            ];
        return this._segments;
    }

    getText() {
        return this.text;
    }

    startsWith(prefix: string) {
        return this.text.startsWith(prefix);
    }

    contains(text: string) {
        return this.text.indexOf(text) >= 0;
    }

    withPreviousGraphemeReplaced(char: string, position: number) {
        return position < 0 || position > this.getGraphemes().length
            ? undefined
            : new UnicodeString(
                  [
                      ...this.getGraphemes()
                          .slice(0, position - 1)
                          .join(''),
                      char,
                      ...this.getGraphemes().slice(position),
                  ].join('')
              );
    }

    withGraphemesAt(graphemes: string, position: number) {
        return position < 0 || position > this.getGraphemes().length
            ? undefined
            : new UnicodeString(
                  [
                      ...this.getGraphemes().slice(0, position).join(''),
                      graphemes,
                      ...this.getGraphemes().slice(position),
                  ].join('')
              );
    }

    withoutGraphemeAt(position: number) {
        return position < 0 || position >= this.getGraphemes().length
            ? undefined
            : new UnicodeString(
                  [
                      ...this.getGraphemes().slice(0, position),
                      ...this.getGraphemes().slice(position + 1),
                  ].join('')
              );
    }

    withoutGraphemesBetween(start: number, endExclusive: number) {
        const segments = this.getGraphemes();
        return start < 0 ||
            endExclusive < 0 ||
            start > segments.length ||
            endExclusive > segments.length
            ? undefined
            : new UnicodeString(
                  [
                      ...segments.slice(0, start),
                      ...segments.slice(endExclusive),
                  ].join('')
              );
    }

    isEmpty() {
        return this.text.length === 0;
    }

    getLength() {
        return this.getGraphemes().length;
    }

    getLines() {
        return this.text.split('\n').map((t) => new UnicodeString(t));
    }

    substring(start: number, end: number) {
        return new UnicodeString(
            this.getGraphemes().slice(start, end).join('')
        );
    }

    split(delimiter: string): string[] {
        const delimiterGraphemes = new UnicodeString(delimiter).getGraphemes();
        let graphemes = this.getGraphemes();
        const segments: string[] = [];
        let current = '';
        while (graphemes.length > 0) {
            // Is the next sequence a delimter match?
            if (
                graphemes.length >= delimiterGraphemes.length &&
                delimiterGraphemes.every(
                    (grapheme, index) => graphemes[index] === grapheme
                )
            ) {
                if (delimiterGraphemes.length === 0)
                    current = current + graphemes[0];
                graphemes = graphemes.slice(
                    Math.max(1, delimiterGraphemes.length)
                );
                segments.push(current);
                current = '';
            } else {
                current += graphemes.shift();
            }
        }
        if (current.length > 0) segments.push(current);
        return segments;
    }

    at(position: number) {
        const segments = this.getGraphemes();
        return position < 0 || position >= segments.length
            ? undefined
            : this.getGraphemes()[position];
    }

    is(text: string) {
        return this.text === text;
    }

    toString() {
        return this.text;
    }
}
