import type Token from '../nodes/Token';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export class UnknownName extends Conflict {
    readonly name: Token;

    constructor(name: Token) {
        super(false);
        this.name = name;
    }

    getConflictingNodes() {
        return { primary: this.name, secondary: [] };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.UnknownName.primary(this.name.getText());
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
