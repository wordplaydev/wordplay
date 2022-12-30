import type Definition from '../nodes/Definition';
import TypeVariable from '../nodes/TypeVariable';
import type Context from '../nodes/Context';
import type LanguageCode from '../nodes/LanguageCode';
import type Node from '../nodes/Node';

export default class Refer {
    readonly creator: (name: string, operator?: string) => Node;
    readonly definition: Definition;

    constructor(
        creator: (name: string, op?: string) => Node,
        definition: Definition
    ) {
        this.creator = creator;
        this.definition = definition;
    }

    getNode(languages: LanguageCode[]) {
        return this.creator(
            this.definition.getTranslation(languages),
            this.definition.getTranslation(['😀'])
        );
    }

    getType(context: Context) {
        return this.definition instanceof TypeVariable
            ? undefined
            : this.definition.getType(context);
    }

    equals(refer: Refer) {
        return refer.definition === this.definition;
    }
}
