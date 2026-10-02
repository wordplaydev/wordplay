import type { LocaleTextAccessor } from '#locale/Locales.ts';

export default class OutputPropertyText {
    readonly validator: (text: string) => LocaleTextAccessor | true;
    constructor(validator: (text: string) => LocaleTextAccessor | true) {
        this.validator = validator;
    }
}
