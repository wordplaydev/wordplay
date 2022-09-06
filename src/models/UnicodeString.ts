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

    withGraphemeAt(char: string, position: number) {
        return new UnicodeString(this.text.substring(0, position) + char + this.text.substring(position));
    }

    withoutGraphemeAt(position: number) {
        return new UnicodeString(this.text.substring(0, position) + this.text.substring(position + 1));
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