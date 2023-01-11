import type { NativeTypeName } from '../native/NativeConstants';
import type Translation from '../translations/Translation';
import Type from './Type';

export default class NeverType extends Type {
    constructor() {
        super();
    }

    getGrammar() {
        return [];
    }

    acceptsAll() {
        return false;
    }
    getNativeTypeName(): NativeTypeName {
        return 'never';
    }
    computeConflicts() {}

    toWordplay() {
        return '-';
    }

    clone() {
        return new NeverType() as this;
    }

    getNodeTranslation(translation: Translation) {
        return translation.nodes.NeverType;
    }
}
