import type Context from '@nodes/Context';
import type Type from '@nodes/Type';
import type Evaluator from '@runtime/Evaluator';
import type { BasisTypeName } from '@basis/BasisConstants';
import type Locales from '@locale/Locales';
import type { LocaleTextAccessor } from '@locale/Locales';
import type Expression from '@nodes/Expression';

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

    abstract getDescription(): LocaleTextAccessor;

    /** Used to get a shorthand textual representation of the value, for previews and other summaries. */
    abstract getRepresentativeText(locales: Locales): string;

    /**
     * Should returns a rough estimate of how much memory this value uses.
     * Used to manage history size.
     */
    abstract getSize(): number;

    /** True if this value is a collection the translate (↦) construct can iterate. Overridden by List, Set, Map, and Table values. */
    isCollection(): boolean {
        return false;
    }

    /** The ordered items a translate (↦) binds to `.`, one per iteration. Only meaningful when isCollection() is true. */
    getTranslationItems(): Value[] {
        return [];
    }

    /** Build a new collection of this value's kind from the translated results, preserving structure (e.g. Map keys). Only meaningful when isCollection() is true. */
    createTranslation(_creator: Expression, _results: Value[]): Value {
        return this;
    }
}
