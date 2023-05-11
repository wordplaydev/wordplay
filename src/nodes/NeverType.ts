import type { NativeTypeName } from '../native/NativeConstants';
import type Locale from '@translation/Locale';
import Type from './Type';
import Glyphs from '../lore/Glyphs';
import { NEVER_SYMBOL } from '@parser/Symbols';

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
        return NEVER_SYMBOL;
    }

    clone() {
        return new NeverType() as this;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.NeverType;
    }

    getGlyphs() {
        return Glyphs.Never;
    }
}
