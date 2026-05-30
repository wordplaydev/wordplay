/**
 * A debounced view of a reactive value, for use in search inputs. Call it once
 * during component init with a getter for the value to track:
 *
 *   const q = debounced(() => query);
 *   // ...later, in a $derived: searchItems(records, q.current, languages)
 *
 * `current` updates to the latest tracked value only after `delay` ms of quiet,
 * so a full search doesn't run on every keystroke. Because it uses `$effect`, it
 * must be created while a component is initializing.
 */
export function debounced<T>(
    get: () => T,
    delay: number = 150,
): { readonly current: T } {
    let current = $state(get());
    let timer: ReturnType<typeof setTimeout> | undefined;
    $effect(() => {
        const next = get();
        clearTimeout(timer);
        timer = setTimeout(() => {
            current = next;
        }, delay);
        return () => clearTimeout(timer);
    });
    return {
        get current() {
            return current;
        },
    };
}
