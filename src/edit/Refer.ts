import type Context from '@nodes/Context';
import type Definition from '@nodes/Definition';
import type Node from '@nodes/Node';
import TypeVariable from '@nodes/TypeVariable';
import type Locales from '../locale/Locales';

export default class Refer {
    readonly creator: (name: string, operator?: string) => Node;
    readonly definition: Definition;
    readonly operator: boolean;

    constructor(
        creator: (name: string) => Node,
        definition: Definition,
        operator: boolean = false,
    ) {
        this.creator = creator;
        this.definition = definition;
        this.operator = operator;
    }

    getNode(locales: Locales) {
        return this.creator(
            this.operator
                ? (this.definition.names.getOperatorName()?.getName() ??
                      this.definition.getPreferredName(locales.getLocales()))
                : this.definition.getPreferredName(locales.getLocales()),
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

    toString() {
        return `${this.definition.getNames()[0]}`;
    }
}
