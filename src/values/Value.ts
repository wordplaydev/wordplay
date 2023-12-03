import type Context from '@nodes/Context';
import type Type from '@nodes/Type';
import type Evaluator from '@runtime/Evaluator';
import type { BasisTypeName } from '../basis/BasisConstants';
import type Expression from '../nodes/Expression';
import type Markup from '../nodes/Markup';
import type Concretizer from '@nodes/Concretizer';
import type Locales from '../locale/Locales';

/** Used to uniquely distinguish values. */
let VALUE_ID = 0;

export default abstract class Value {
    readonly id = VALUE_ID++;
    readonly creator: Expression;

    constructor(creator: Expression) {
        this.creator = creator;
    }

    /** Returns a Wordplay sytnax representation of the value. */
    toString(): string {
        return this.toWordplay();
    }

    abstract toWordplay(locales?: Locales): string;

    /** Returns the Structure defining this value's interface. */
    abstract getType(context: Context): Type;

    abstract getBasisTypeName(): BasisTypeName;

    /** Returns the value with the given name in the structure. */
    abstract resolve(name: string, evaluator?: Evaluator): Value | undefined;

    abstract isEqualTo(value: Value): boolean;

    abstract getDescription(concretizer: Concretizer, locales: Locales): Markup;

    /** Used to get a shorthand textual representation of the value, for previews and other summaries. */
    abstract getRepresentativeText(locales: Locales): string;

    /**
     * Should returns a rough estimate of how much memory this value uses.
     * Used to manage history size.
     */
    abstract getSize(): number;
}
