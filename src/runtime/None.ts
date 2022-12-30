import NoneType from '../nodes/NoneType';
import { NONE_SYMBOL } from '../parser/Tokenizer';
import Value from './Value';
import type Node from '../nodes/Node';
import type { NativeTypeName } from '../native/NativeConstants';

export default class None extends Value {
    constructor(creator: Node) {
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
}
