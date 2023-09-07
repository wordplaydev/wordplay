import type { BasisTypeName } from '../basis/BasisConstants';
import type Locale from '@locale/Locale';
import type Context from './Context';
import type Node from './Node';
import Type from './Type';
import { UNKNOWN_SYMBOL } from '../parser/Symbols';
import Glyphs from '../lore/Glyphs';
import type Markup from './Markup';
import type { Grammar } from './Node';

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

    getGrammar(): Grammar {
        return [];
    }

    computeConflicts() {
        return [];
    }

    acceptsAll() {
        return false;
    }

    getBasisTypeName(): BasisTypeName {
        return 'unknown';
    }

    clone() {
        return this;
    }

    toWordplay() {
        return UNKNOWN_SYMBOL;
    }

    getReasons(): UnknownType<Node>[] {
        return [
            this,
            ...(this.why instanceof UnknownType
                ? [...this.why.getReasons()]
                : []),
        ];
    }

    getNodeLocale(locale: Locale) {
        return locale.node.UnknownType;
    }

    abstract getReason(locale: Locale, context: Context): Markup;

    getGlyphs() {
        return Glyphs.Unknown;
    }
}
