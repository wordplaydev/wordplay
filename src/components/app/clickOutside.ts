export function clickOutside(node: HTMLElement) {
    const handleClick = (event: MouseEvent) => {
        if (event.target instanceof Node && !node.contains(event.target)) {
            node.dispatchEvent(new CustomEvent('outclick'));
        }
    };

    document.addEventListener('click', handleClick, true);

    return {
        destroy() {
            document.removeEventListener('click', handleClick, true);
        },
    };
}
