import Conflict from './Conflict';
import type Bind from '../nodes/Bind';
import type Translation from '../translations/Translation';

export default class InputListMustBeLast extends Conflict {
    readonly bind: Bind;

    constructor(rest: Bind) {
        super(false);

        this.bind = rest;
    }

    getConflictingNodes() {
        return { primary: this.bind, secondary: [] };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.InputListMustBeLast.primary();
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
