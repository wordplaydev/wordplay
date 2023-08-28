import type LanguageCode from '../../locale/LanguageCode';

export default class Announcement {
    readonly kind: string;
    readonly language: LanguageCode | undefined;
    readonly text: string;

    constructor(
        kind: string,
        language: LanguageCode | undefined,
        text: string
    ) {
        this.kind = kind;
        this.language = language;
        this.text = text;
    }
}
