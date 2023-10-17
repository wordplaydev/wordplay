import UnknownType from './UnknownType';
import type Token from './Token';
import type Node from './Node';
import type Type from './Type';
import type { TemplateInput } from '../locale/concretize';
import type Concretizer from './Concretizer';
import type Locales from '../locale/Locales';

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

    getReason(concretize: Concretizer, locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.node.UnknownNameType.description),
            ...this.getDescriptionInputs()
        );
    }

    getDescriptionInputs(): TemplateInput[] {
        return [this.name?.getText()];
    }
}
