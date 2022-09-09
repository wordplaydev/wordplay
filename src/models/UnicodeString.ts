// TODO We probably need to include the list of all languages we support here.
const segmenter = new Intl.Segmenter();

export default class UnicodeString {

    readonly text: string;

    /* A cache of grapheme segments in the given string, crucial for reasoning about visible characters. */
    _segments: string[] | undefined = undefined;

    constructor(text: string) {

        // Ensure text is comparable.
        this.text = text.normalize();

    }

    getSegments() {
        if(this._segments === undefined)
            this._segments = [...segmenter.segment(this.text)].map(s => s.segment);
        return this._segments;
    }

    getText() { return this.text; }

    withPreviousGraphemeReplaced(char: string, position: number) {
        return position < 0 || position > this.getSegments().length ? undefined : new UnicodeString([ ...this.getSegments().slice(0, position - 1).join(""), char, ...this.getSegments().slice(position)].join(""));
    }

    withGraphemeAt(char: string, position: number) {
        return position < 0 || position > this.getSegments().length ? undefined : new UnicodeString([ ...this.getSegments().slice(0, position).join(""), char, ...this.getSegments().slice(position)].join(""));
    }

    withoutGraphemeAt(position: number) {
        return position < 0 || position >= this.getSegments().length ? undefined : new UnicodeString([ ...this.getSegments().slice(0, position), ...this.getSegments().slice(position + 1)].join(""));
    }

    withoutGraphemesBetween(start: number, endExclusive: number) {
        const segments = this.getSegments();
        return (start < 0 || endExclusive < 0 || start > segments.length || endExclusive > segments.length) ? undefined :
            new UnicodeString([ ...segments.slice(0, start), ...segments.slice(endExclusive)].join(""));
    }

    getLength() {
        return this.getSegments().length;
    }

    getLines() { 
        return this.text.split("\n").map(t => new UnicodeString(t));
    }

    substring(start: number, end: number) {
        return new UnicodeString(this.getSegments().slice(start, end).join(""));
    }

    at(position: number) {
        const segments = this.getSegments();
        return position < 0 || position >= segments.length ? undefined : this.getSegments()[position];
    }

    is(text: string) {
        return this.text === text;
    }

    toString() { return this.text; }

}