import UnknownType from './UnknownType';
import type Token from './Token';
import type Node from './Node';
import type Type from './Type';
import type Locale from '@locale/Locale';
import type Context from './Context';
import type { TemplateInput } from '../locale/locales/concretize';
import concretize from '../locale/locales/concretize';

export default class UnknownNameType extends UnknownType<Node> {
    readonly name: Token | undefined;

    constructor(
        expression: Node,
        name: Token | undefined,
        why: Type | undefined
    ) {
        super(expression, why);

        this.name = name;
    }

    getReason(locale: Locale) {
        return concretize(locale, locale.node.UnknownNameType.description);
    }

    getDescriptionInputs(_: Locale, __: Context): TemplateInput[] {
        return [this.name?.getText()];
    }
}
