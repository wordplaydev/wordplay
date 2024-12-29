export default function debounce(func: () => void, timeout = 300) {
    let timer: NodeJS.Timeout | undefined;
    return ((...args) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => func(...args), timeout);
    })();
}
