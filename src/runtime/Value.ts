import type Context from '@nodes/Context';
import type Type from '@nodes/Type';
import type Evaluator from './Evaluator';
import type LanguageCode from '@locale/LanguageCode';
import type { NativeTypeName } from '../native/NativeConstants';
import type Locale from '@locale/Locale';
import type Expression from '../nodes/Expression';
import type Markup from '../nodes/Markup';

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
        return this.toWordplay(['en']);
    }

    abstract toWordplay(languages: LanguageCode[]): string;

    /** Returns the Structure defining this value's interface. */
    abstract getType(context: Context): Type;

    abstract getNativeTypeName(): NativeTypeName;

    /** Returns the value with the given name in the structure. */
    abstract resolve(name: string, evaluator?: Evaluator): Value | undefined;

    abstract isEqualTo(value: Value): boolean;

    abstract getDescription(translation: Locale): Markup;

    /**
     * Should returns a rough estimate of how much memory this value uses.
     * Used to manage history size.
     */
    abstract getSize(): number;
}
