import type Context from '@nodes/Context';
import type Type from '@nodes/Type';
import type Evaluator from './Evaluator';
import type LanguageCode from '@translation/LanguageCode';
import type { NativeTypeName } from '../native/NativeConstants';
import type Translation from '@translation/Translation';
import type { Description } from '@translation/Translation';
import type Expression from '../nodes/Expression';

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

    abstract getDescription(translation: Translation): Description;
}
