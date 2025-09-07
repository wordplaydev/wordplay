/** A Svelte action that listens for pointer down events on our outside the element and calls the callback. */
export function clickOutside(node: HTMLElement, outside: () => void) {
    const handleClick = (event: MouseEvent) => {
        if (event.target === node && event.target instanceof HTMLElement) {
            const rect = event.target.getBoundingClientRect();

            const clickedInDialog =
                rect.top <= event.clientY &&
                event.clientY <= rect.top + rect.height &&
                rect.left <= event.clientX &&
                event.clientX <= rect.left + rect.width;

            if (!clickedInDialog) outside();
        }
    };

    document.addEventListener('pointerdown', handleClick, true);

    return {
        destroy: () =>
            document.removeEventListener('pointerdown', handleClick, true),
    };
}
