/**
 * Call a function soon, but if it's called again, delay calling it by the specified duration.
 * */
export default function debounce(func: () => void, delay = 300) {
    let timer: NodeJS.Timeout | undefined;
    return ((...args) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => func(...args), delay);
    })();
}
