import NoneType from '@nodes/NoneType';
import { NONE_SYMBOL } from '@parser/Symbols';
import type Value from './Value';
import type { NativeTypeName } from '../native/NativeConstants';
import Primitive from './Primitive';
import type Translation from '@translation/Translation';
import type Expression from '../nodes/Expression';

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

    resolve() {
        return undefined;
    }

    isEqualTo(value: Value) {
        return value instanceof None;
    }

    toWordplay() {
        return NONE_SYMBOL;
    }

    getDescription(translation: Translation) {
        return translation.data.none;
    }

    getSize() {
        return 1;
    }
}
