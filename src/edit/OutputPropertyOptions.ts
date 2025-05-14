import type Expression from '../nodes/Expression';

export default class OutputPropertyOptions {
    readonly values: { value: string; label: string }[];
    readonly allowNone: boolean;
    /** Given some text from the select, convert to an expression for replacement */
    readonly fromText: (text: string) => Expression | undefined;
    readonly toText: (expression: Expression | undefined) => string | undefined;
    constructor(
        values: { value: string; label: string }[] | string[],
        allowNone: boolean,
        from: (text: string) => Expression | undefined,
        to: (expression: Expression | undefined) => string | undefined,
    ) {
        this.values = values.map((value) =>
            typeof value === 'string' ? { value: value, label: value } : value,
        );
        this.allowNone = allowNone;
        this.fromText = from;
        this.toText = to;
    }
}
