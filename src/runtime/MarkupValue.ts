import type Locale from '../locale/Locale';
import concretize from '../locale/concretize';
import type { BasisTypeName } from '../basis/BasisConstants';
import FormattedType from '../nodes/FormattedType';
import type Markup from '../nodes/Markup';
import type Type from '../nodes/Type';
import Simple from './Simple';
import type Value from './Value';
import type FormattedLiteral from '../nodes/FormattedLiteral';

export default class MarkupValue extends Simple {
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

    getDescription(locale: Locale): Markup {
        return concretize(locale, locale.node.Docs.name);
    }

    getSize(): number {
        return 1;
    }

    toWordplay() {
        return this.markup.toWordplay();
    }
}
