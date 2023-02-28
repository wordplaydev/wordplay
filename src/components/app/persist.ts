export function setPersistedValue(
    key: string,
    value: string | number | boolean | string[] | null
) {
    if (typeof window !== 'undefined') {
        if (value === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, JSON.stringify(value));
    }
}

export function getPersistedValue<Type>(key: string): Type | null {
    const value =
        typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    return value === null ? null : (JSON.parse(value) as Type);
}
