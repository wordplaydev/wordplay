export default class UnicodeString {

    readonly text: string;
    readonly segments: string[];

    constructor(text: string) {

        // Ensure text is comparable.
        this.text = text.normalize();

        // TODO We probably need to include the list of all languages we support here.
        // It segments by graphemes by default
        const segmenter = new Intl.Segmenter();
        this.segments = [...segmenter.segment(this.text)].map(s => s.segment);

    }

    getText() { return this.text; }

    withPreviousGraphemeReplaced(char: string, position: number) {
        return position < 0 || position > this.segments.length ? undefined : new UnicodeString([ ...this.segments.slice(0, position - 1).join(""), char, ...this.segments.slice(position)].join(""));
    }

    withGraphemeAt(char: string, position: number) {
        return position < 0 || position > this.segments.length ? undefined : new UnicodeString([ ...this.segments.slice(0, position).join(""), char, ...this.segments.slice(position)].join(""));
    }

    withoutGraphemeAt(position: number) {
        return position < 0 || position >= this.segments.length ? undefined : new UnicodeString([ ...this.segments.slice(0, position), ...this.segments.slice(position + 1)].join(""));
    }

    getLength() {
        return this.segments.length;
    }

    getLines() { 
        return this.text.split("\n").map(t => new UnicodeString(t));
    }

    substring(start: number, end: number) {
        return new UnicodeString(this.segments.slice(start, end).join(""));
    }

    at(position: number) {
        return this.segments[position];
    }

    is(text: string) {
        return this.text === text;
    }

    toString() { return this.text; }

}