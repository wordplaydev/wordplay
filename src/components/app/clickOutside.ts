/** A Svelte action that listens for pointer down events on our outside the element and calls the callback. */
export function clickOutside(node: HTMLElement, outside: () => void) {
    const handleClick = (event: MouseEvent) => {
        if (event.target === node || !node.contains(event.target as Node)) {
            outside();
        }
    };

    document.addEventListener('pointerdown', handleClick, true);

    return {
        destroy: () =>
            document.removeEventListener('pointerdown', handleClick, true),
    };
}
