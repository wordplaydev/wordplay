import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import type { BasisTypeName } from '../basis/BasisConstants';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import { UNKNOWN_SYMBOL } from '../parser/Symbols';
import type Context from './Context';
import type Markup from './Markup';
import type Node from './Node';
import type { Grammar } from './Node';
import Sym from './Sym';
import Token from './Token';
import Type from './Type';

export default abstract class UnknownType<
    ExpressionType extends Node,
> extends Type {
    readonly expression: ExpressionType;
    readonly why: Type | undefined;

    constructor(expression: ExpressionType, why: Type | undefined) {
        super();

        this.expression = expression;
        this.why = why;
    }

    getDescriptor(): NodeDescriptor {
        return 'UnknownType';
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

    getDescription(locales: Locales, context: Context): Markup {
        const reasons = this.getReasons().map((reason) =>
            reason.getReason(locales, context),
        );

        const start = super.getDescription(locales, context);

        // Get the unknown type description
        let parts: (Markup | Token)[] = [];

        // Get all the reasons for the unknown types.
        for (const reason of reasons) {
            parts = [
                ...parts,
                new Token(
                    locales.get((l) => l.node.UnknownType.connector),
                    Sym.Words,
                ),
                reason,
            ];
        }

        // Make a bunch of markup for each reason.
        return start.append(parts);
    }

    static readonly LocalePath = (l: LocaleText) => l.node.UnknownType;
    getLocalePath() {
        return UnknownType.LocalePath;
    }

    abstract getReason(locales: Locales, context: Context): Markup;

    getCharacter() {
        return Characters.Unknown;
    }
}
