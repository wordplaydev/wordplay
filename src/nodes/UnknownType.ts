import type { NativeTypeName } from '../native/NativeConstants';
import type Translation from '../translations/Translation';
import type { Description } from '../translations/Translation';
import type Context from './Context';
import type Node from './Node';
import Type from './Type';

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
        return '⁇';
    }

    getReasons(): UnknownType<any>[] {
        return [
            this,
            ...(this.why instanceof UnknownType
                ? [...this.why.getReasons()]
                : []),
        ];
    }

    getDescription(translation: Translation, context: Context): Description {
        return translation.types.UnknownType.description(
            this,
            translation,
            context
        );
    }

    abstract getReason(translation: Translation, context: Context): Description;
}
