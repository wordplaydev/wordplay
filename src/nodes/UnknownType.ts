import type { NodeDescriptor } from '@locale/NodeTexts';
import type { BasisTypeName } from '../basis/BasisConstants';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import { UNKNOWN_SYMBOL } from '../parser/Symbols';
import type Context from './Context';
import type Markup from './Markup';
import type Node from './Node';
import type { Grammar } from './Node';
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
        let segments: string[] = [
            // Get the unknown type description
            ...super.getDescription(locales, context).toWordplay(),
        ];
        // Get all the reasons for the unknown types.
        for (const reason of reasons) {
            segments = [
                ...segments,
                locales.get((l) => l.node.UnknownType.connector),

                ...reason.toWordplay(),
            ];
        }

        // Make a bunch of markup for each reason.
        return locales.concretize(segments.join('\n\n'));
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.UnknownType);
    }

    abstract getReason(locales: Locales, context: Context): Markup;

    getCharacter() {
        return Characters.Unknown;
    }
}
