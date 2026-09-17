import { last, must } from '@util/nullable';

/** Whether a value is something a locale path can descend into: an object or
 *  an array, since a path addresses both. */
function isContainer(value: unknown): value is object {
    return typeof value === 'object' && value !== null;
}

export default class LocalePath {
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

    /**
     * The object this path's key sits in, or undefined when the path names
     * nothing. Arrays count: a locale path descends into one wherever a
     * document is a list of paragraphs or a tuple of labels.
     */
    private retrieve(locale: object): object | undefined {
        let container: unknown = locale;
        for (const key of this.path) {
            if (!isContainer(container) || !(key in container))
                return undefined;
            container = Reflect.get(container, key);
        }

        return isContainer(container) ? container : undefined;
    }

    isGlobalName() {
        // A definition's own names sit two levels under `input` or `output`.
        // Read from the path rather than walking up with `parent()`, which a
        // top-level path has no answer for.
        const grandparent = this.path[this.path.length - 2];
        return (
            (grandparent === 'input' || grandparent === 'output') &&
            this.key === 'names'
        );
    }

    resolve(locale: object): string | string[] | undefined {
        const record = this.retrieve(locale);
        if (record === undefined) return undefined;
        const text: unknown = Reflect.get(record, this.key);
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

    /** Given an object and a new value, set the key in the object to the value, if the path exists.
     *  An undefined value is no repair at all rather than a bare `$?`: callers reach it only
     *  through an array index the type system cannot prove is populated, and writing a marker
     *  with no words after it is the one thing an unwritten string must never be. */
    repair(object: object, value: string | string[] | undefined) {
        if (value === undefined) return;
        const record = this.retrieve(object);
        if (record) Reflect.set(record, this.key, value);
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
        return new LocalePath(
            this.path.slice(0, this.path.length - 1),
            // Only a path with a parent has one to name.
            must(last(this.path), 'a parent key'),
            this.value,
        );
    }

    toString(): string {
        return `${this.path.join('.')}.${this.key}`;
    }

    equals(path: LocalePath): boolean {
        return this.toString() === path.toString();
    }
}

/** This converts the locale into a list of key/value pairs for verification.
 */
export function getKeyTemplatePairs(
    /** Any object: a typed locale or tutorial, or a record read from JSON.
     *  What is walked is its own keys, whatever its declared type. */
    source: object,
    pairs: LocalePath[] = [],
    path: (string | number)[] = [],
): LocalePath[] {
    for (const unparsedKey of Object.keys(source)) {
        // See if the key is a number, and convert it to one if so.
        const parsedKey = parseInt(unparsedKey);
        const key = !isNaN(parsedKey) ? parsedKey : unparsedKey;

        // Read reflectively rather than copying: this walks every string in
        // every locale file, so a spread per node would be a copy of the file.
        const value: unknown = Reflect.get(source, key);
        if (
            typeof value === 'string' ||
            (Array.isArray(value) && value.every((s) => typeof s === 'string'))
        )
            pairs.push(new LocalePath(path, key, value));
        // Many docs are lists of strings that are intended to be joined together.
        // Account for these when finding strings for verification.
        else if (
            Array.isArray(value) &&
            value.every((v) => typeof v === 'string')
        )
            pairs.push(new LocalePath(path, key, value));
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
