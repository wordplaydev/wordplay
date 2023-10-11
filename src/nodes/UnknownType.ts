import type { BasisTypeName } from '../basis/BasisConstants';
import type Locale from '@locale/Locale';
import type Context from './Context';
import type Node from './Node';
import Type from './Type';
import { UNKNOWN_SYMBOL } from '../parser/Symbols';
import Glyphs from '../lore/Glyphs';
import Markup from './Markup';
import type { Grammar } from './Node';
import type Concretizer from './Concretizer';
import Paragraph, { type Segment } from './Paragraph';
import Token from './Token';
import Sym from './Sym';

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

    getDescription(
        concretizer: Concretizer,
        locale: Locale,
        context: Context
    ): Markup {
        const reasons = this.getReasons().map((reason) =>
            reason.getReason(concretizer, locale, context)
        );
        let spaces = undefined;
        let segments: Segment[] = [
            // Get the unknown type description
            ...super.getDescription(concretizer, locale, context).paragraphs[0]
                .segments,
        ];
        // Get all the reasons for the unknown types.
        for (const reason of reasons) {
            segments = [
                ...segments,
                new Token(locale.node.UnknownType.connector, Sym.Words),
                ...reason.paragraphs[0].segments,
            ];
            spaces =
                spaces === undefined
                    ? reason.spaces
                    : reason.spaces
                    ? spaces.withSpaces(reason.spaces)
                    : spaces;
        }

        // Make a bunch of markup for each reason.
        return new Markup([new Paragraph(segments)], spaces);
    }

    getNodeLocale(locale: Locale) {
        return locale.node.UnknownType;
    }

    abstract getReason(
        concretizer: Concretizer,
        locale: Locale,
        context: Context
    ): Markup;

    getGlyphs() {
        return Glyphs.Unknown;
    }
}
