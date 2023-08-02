import Language from '@nodes/Language';
import TextType from '@nodes/TextType';
import Number from './Number';
import Simple from './Simple';
import type Value from './Value';
import type { BasisTypeName } from '../basis/BasisConstants';
import type Locale from '@locale/Locale';
import type Expression from '../nodes/Expression';
import List from './List';
import Bool from './Bool';
import concretize from '../locale/concretize';
import UnicodeString from '../models/UnicodeString';

export default class Text extends Simple {
    readonly text: string;
    readonly format: string | undefined;

    constructor(creator: Expression, text: string, format?: string) {
        super(creator);

        // We normalize all strings to ensure they are comparable.
        this.text = text.normalize();
        this.format =
            format === undefined || format === '' ? undefined : format;
    }

    getType() {
        return TextType.make(
            undefined,
            this.format === undefined ? undefined : Language.make(this.format)
        );
    }

    getBasisTypeName(): BasisTypeName {
        return 'text';
    }

    /* The number of graphemes in the text (not the number of code points). */
    length(requestor: Expression) {
        return new Number(requestor, [...this.text].length);
    }

    repeat(requestor: Expression, count: number) {
        return new Text(requestor, this.text.repeat(count), this.format);
    }

    segment(requestor: Expression, delimiter: Text) {
        return new List(
            requestor,
            new UnicodeString(this.text)
                .split(delimiter.text)
                .map((s) => new Text(requestor, s))
        );
    }

    combine(requestor: Expression, text: Text) {
        return new Text(requestor, this.text + text.text);
    }

    has(requestor: Expression, text: Text) {
        return new Bool(requestor, this.text.includes(text.text));
    }

    starts(requestor: Expression, text: Text) {
        return new Bool(requestor, this.text.startsWith(text.text));
    }

    ends(requestor: Expression, text: Text) {
        return new Bool(requestor, this.text.endsWith(text.text));
    }

    toWordplay(): string {
        return `"${this.text}"${this.format ? `/${this.format}` : ''}`;
    }

    isEqualTo(text: Value) {
        return (
            text instanceof Text &&
            this.text === text.text &&
            this.format === text.format
        );
    }

    getDescription(locale: Locale) {
        return concretize(locale, locale.term.text);
    }

    getSize() {
        return 1;
    }
}
