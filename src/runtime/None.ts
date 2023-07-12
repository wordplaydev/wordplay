import NoneType from '@nodes/NoneType';
import { NONE_SYMBOL } from '@parser/Symbols';
import type Value from './Value';
import type { NativeTypeName } from '../native/NativeConstants';
import Primitive from './Primitive';
import type Locale from '@locale/Locale';
import type Expression from '../nodes/Expression';
import concretize from '../locale/concretize';

export default class None extends Primitive {
    constructor(creator: Expression) {
        super(creator);
    }

    getType() {
        return NoneType.None;
    }

    getNativeTypeName(): NativeTypeName {
        return 'none';
    }

    isEqualTo(value: Value) {
        return value instanceof None;
    }

    toWordplay() {
        return NONE_SYMBOL;
    }

    getDescription(locale: Locale) {
        return concretize(locale, locale.term.none);
    }

    getSize() {
        return 1;
    }
}
