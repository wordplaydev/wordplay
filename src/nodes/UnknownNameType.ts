import UnknownType from './UnknownType';
import type Token from './Token';
import type Node from './Node';
import type Type from './Type';
import type Locale from '@locale/Locale';
import type { TemplateInput } from '../locale/concretize';
import concretize from '../locale/concretize';

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
        return concretize(locale, locale.node.UnknownNameType.name);
    }

    getDescriptionInputs(): TemplateInput[] {
        return [this.name?.getText()];
    }
}
