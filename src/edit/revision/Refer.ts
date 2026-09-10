import type Locales from '@locale/Locales';
import type Context from '@nodes/Context';
import type Definition from '@nodes/Definition';
import type Node from '@nodes/Node';
import TypeVariable from '@nodes/TypeVariable';

export default class Refer {
    readonly creator: (name: string, operator?: string) => Node;
    readonly definition: Definition;
    /** True if this should be rendered with an operator name */
    readonly operator: boolean;
    /** True if this is a unary operator and should be distinguished from uses of the same function as a binary operator */
    readonly unary: boolean;
    /**
     * Distinguishes two suggestions that offer the same definition in different forms — a
     * boolean input given as `name: ⊥` and as the bare-name shorthand `name`. Without it
     * `equals` reads them as the same edit and `removeDuplicates` drops one, arbitrarily,
     * with no error to say it happened.
     */
    readonly variant: string | undefined;

    constructor(
        creator: (name: string) => Node,
        definition: Definition,
        operator: boolean = false,
        unary: boolean = false,
        variant?: string,
    ) {
        this.creator = creator;
        this.definition = definition;
        this.operator = operator;
        this.unary = unary;
        this.variant = variant;
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
        return (
            refer.definition === this.definition &&
            this.unary === refer.unary &&
            this.variant === refer.variant
        );
    }

    toString() {
        return `${this.definition.getNames()[0]}`;
    }
}
