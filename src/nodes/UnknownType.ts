import type { NativeTypeName } from '../native/NativeConstants';
import type Translation from '@translation/Translation';
import type { Description } from '@translation/Translation';
import type Context from './Context';
import type Node from './Node';
import Type from './Type';
import { UNKNOWN_SYMBOL } from '../parser/Symbols';
import Glyphs from '../lore/Glyphs';

export default abstract class UnknownType<
    ExpressionType extends Node
> extends Type {
    readonly expression: ExpressionType;
    readonly why: Type | undefined;

    constructor(expression: ExpressionType, why: Type | undefined) {
        super();

        this.expression = expression;
        this.why = why;
    }

    getGrammar() {
        return [];
    }

    computeConflicts() {}

    acceptsAll() {
        return false;
    }

    getNativeTypeName(): NativeTypeName {
        return 'unknown';
    }
    clone() {
        return this;
    }

    toWordplay() {
        return UNKNOWN_SYMBOL;
    }

    getReasons(): UnknownType<any>[] {
        return [
            this,
            ...(this.why instanceof UnknownType
                ? [...this.why.getReasons()]
                : []),
        ];
    }

    getNodeTranslation(translation: Translation) {
        return translation.nodes.UnknownType;
    }

    abstract getReason(translation: Translation, context: Context): Description;

    getGlyphs() {
        return Glyphs.Unknown;
    }
}
