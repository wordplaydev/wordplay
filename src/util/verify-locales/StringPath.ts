import { Unwritten } from '@locale/LocaleText';

export default class StringPath {
    // The key or number indexing into the object literal.
    readonly path: (string | number)[];
    readonly key: string | number;
    readonly value: string | string[];

    constructor(
        path: (string | number)[],
        key: string | number,
        value: string | string[],
    ) {
        this.path = path;
        this.key = key;
        this.value = value;
    }

    private retrieve(
        locale: Record<string, unknown>,
    ): Record<string, unknown> | undefined {
        let record: Record<string, unknown> = locale;
        for (const key of this.path) {
            if (!(key in record)) return undefined;
            const value = record[key];
            if (typeof value !== 'object' || value === null) return undefined;
            record = value as Record<string, unknown>;
        }

        return record;
    }

    resolve(locale: Record<string, unknown>): string | string[] | undefined {
        const record = this.retrieve(locale);
        if (record === undefined) return undefined;
        const text = record[this.key];
        if (
            text === undefined ||
            (typeof text !== 'string' &&
                !(
                    Array.isArray(text) &&
                    text.every((t) => typeof t === 'string')
                ))
        )
            return undefined;
        return text;
    }

    /** Given an object and a new value, set the key in the object to the value, if the path exists. */
    repair(
        object: Record<string, unknown>,
        value: string | string[] = Unwritten,
    ) {
        const record = this.retrieve(object);
        if (record) record[this.key] = value;
    }

    top() {
        return this.path.length === 0;
    }

    includes(key: string) {
        return this.path.includes(key);
    }

    endsWith(last: string | number) {
        return this.key === last;
    }

    // Return a string path representing the parent of this path.
    parent() {
        return new StringPath(
            this.path.slice(0, this.path.length - 1),
            this.path[this.path.length - 1],
            this.value,
        );
    }

    toString(): string {
        return `${this.path.join(' -> ')}: ${this.key}`;
    }
}

/** This converts the locale into a list of key/value pairs for verification.
 */
export function getKeyTemplatePairs(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    record: Record<any, any>,
    pairs: StringPath[] = [],
    path: (string | number)[] = [],
): StringPath[] {
    for (const unparsedKey of Object.keys(record)) {
        // See if the key is a number, and convert it to one if so.
        const parsedKey = parseInt(unparsedKey);
        const key = !isNaN(parsedKey) ? parsedKey : unparsedKey;

        const value = record[key];
        if (
            typeof value === 'string' ||
            (Array.isArray(value) && value.every((s) => typeof s === 'string'))
        )
            pairs.push(new StringPath(path, key, value));
        // Many docs are lists of strings that are intended to be joined together.
        // Account for these when finding strings for verification.
        else if (
            Array.isArray(value) &&
            value.every((v) => typeof v === 'string')
        )
            pairs.push(new StringPath(path, key, value));
        else if (
            typeof value === 'object' &&
            value !== undefined &&
            value !== null &&
            !Array.isArray(value)
        )
            getKeyTemplatePairs(value, pairs, [...path, key]);
        else if (Array.isArray(value)) {
            for (let index = 0; index < value.length; index++) {
                const element = value[index];
                if (element)
                    getKeyTemplatePairs(element, pairs, [...path, key, index]);
            }
        }
    }
    return pairs;
}
