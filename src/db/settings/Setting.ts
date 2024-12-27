import { get, writable, type Writable } from 'svelte/store';
import type { Database } from '../Database';

/** Represents a specific key value pair persisted in local storage, backed by a store, with facilities for reading and reading with error checking. */
export default class Setting<Type> {
    readonly key: string;
    /** If true, a device-specific setting. */
    readonly device: boolean;
    readonly defaultValue: Type;
    readonly value: Writable<Type>;
    /** Takes a new value and determines whether it's equal. Used to avoid redundant sets. */
    readonly equal: (current: Type, value: Type) => boolean;
    /** Takes an unknown value from local storage and either accepts it as a Type or returns undefined, indicating default value should be used. */
    readonly validator: (value: unknown) => undefined | Type;

    constructor(
        key: string,
        device: boolean,
        defaultValue: Type,
        validator: (value: unknown) => Type | undefined,
        equal: (current: Type, value: Type) => boolean,
    ) {
        this.key = key;
        this.device = device;
        this.defaultValue = defaultValue;
        this.equal = equal;
        this.validator = validator;
        this.value = writable(this.load());
    }

    load(): Type {
        const valueString =
            typeof window !== 'undefined' &&
            typeof window.localStorage !== 'undefined'
                ? window.localStorage.getItem(this.key)
                : null;

        let value;
        try {
            if (valueString !== null) {
                const parsed = JSON.parse(valueString);
                const validation = this.validator(parsed);
                value = validation;
            }
            if (value === undefined) value = this.defaultValue;
        } catch (_) {
            value = this.defaultValue;
        }
        return value;
    }

    get(): Type {
        return get(this.value);
    }

    set(database: Database, value: Type) {
        if (this.equal(this.get(), value)) return;

        // Save in the store, notifying subscribers about the change.
        this.value.set(value);

        // Try to save in local stoage.
        if (
            typeof window !== 'undefined' &&
            typeof window.localStorage !== 'undefined'
        ) {
            if (value === null) window.localStorage.removeItem(this.key);
            else window.localStorage.setItem(this.key, JSON.stringify(value));
        }

        // If not device-specific, save in Firebase
        // Try to save online, if this is not device specific
        if (!this.device) database.uploadSettings();
    }
}
