export function clickOutside(node: HTMLElement) {
    const handleClick = (event: MouseEvent) => {
        if (event.target instanceof Node && !node.contains(event.target)) {
            node.dispatchEvent(new CustomEvent('outclick'));
        }
    };

    document.addEventListener('pointerdown', handleClick, true);

    return {
        destroy() {
            document.removeEventListener('pointerdown', handleClick, true);
        },
    };
}
