export default class OutputPropertyText {
    readonly validator: (text: string) => boolean;
    constructor(validator: (text: string) => boolean) {
        this.validator = validator;
    }
}
