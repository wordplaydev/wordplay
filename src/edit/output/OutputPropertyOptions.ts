import type Expression from '../../nodes/Expression';

export default class OutputPropertyOptions<
    Extra extends Record<string, unknown> = {},
> {
    readonly values: ({ value: string; label: string } & Extra)[];
    readonly allowNone: boolean;
    /** Given some text from the select, convert to an expression for replacement */
    readonly fromText: (text: string) => Expression | undefined;
    readonly toText: (expression: Expression | undefined) => string | undefined;
    constructor(
        values: ({ value: string; label: string } & Extra)[],
        allowNone: boolean,
        from: (text: string) => Expression | undefined,
        to: (expression: Expression | undefined) => string | undefined,
    ) {
        this.values = [...values];
        this.allowNone = allowNone;
        this.fromText = from;
        this.toText = to;
    }
}
