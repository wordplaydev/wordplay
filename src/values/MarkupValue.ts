import type LocaleText from '@locale/LocaleText';
import Sym from '@nodes/Sym';
import Token from '@nodes/Token';
import type { BasisTypeName } from '../basis/BasisConstants';
import type FormattedLiteral from '../nodes/FormattedLiteral';
import FormattedType from '../nodes/FormattedType';
import type Markup from '../nodes/Markup';
import type Type from '../nodes/Type';
import type Value from '../values/Value';
import SimpleValue from './SimpleValue';

export default class MarkupValue extends SimpleValue {
    readonly markup: Markup;

    constructor(literal: FormattedLiteral, markup: Markup) {
        super(literal);
        this.markup = markup;
    }

    getType(): Type {
        return FormattedType.make();
    }

    getBasisTypeName(): BasisTypeName {
        return 'formatted';
    }

    isEqualTo(value: Value): boolean {
        return (
            value instanceof MarkupValue && value.markup.isEqualTo(this.markup)
        );
    }

    getDescription() {
        return (l: LocaleText) => l.node.Markup.name;
    }

    getRepresentativeText() {
        return this.markup
            .nodes()
            .filter(
                (n): n is Token => n instanceof Token && n.isSymbol(Sym.Words),
            )[0]
            ?.getText();
    }

    getSize(): number {
        return 1;
    }

    toWordplay() {
        return this.markup.toWordplay();
    }
}
