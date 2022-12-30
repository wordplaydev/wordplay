import type { NativeTypeName } from '../native/NativeConstants';
import type Translations from './Translations';
import { TRANSLATE } from './Translations';
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

    getDescriptions(): Translations {
        return {
            '😀': TRANSLATE,
            eng: 'An impossible type',
        };
    }
}
