export default class OutputPropertyText {
    readonly validator: (text: string) => string | true;
    constructor(validator: (text: string) => string | true) {
        this.validator = validator;
    }
}
