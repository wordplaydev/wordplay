import type { NativeTypeName } from '../native/NativeConstants';
import type Translation from '@translation/Translation';
import Type from './Type';
import Glyphs from '../lore/Glyphs';
import { PLACEHOLDER_SYMBOL } from '../parser/Symbols';

export default class AnyType extends Type {
    constructor() {
        super();
    }

    getGrammar() {
        return [];
    }

    acceptsAll() {
        return true;
    }

    getNativeTypeName(): NativeTypeName {
        return 'any';
    }

    computeConflicts() {}

    getNodeTranslation(translation: Translation) {
        return translation.node.AnyType;
    }

    toWordplay() {
        return PLACEHOLDER_SYMBOL;
    }

    clone() {
        return this;
    }

    getGlyphs() {
        return Glyphs.Placeholder;
    }
}
