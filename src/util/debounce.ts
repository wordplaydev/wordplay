export default function debounce(func: () => void, timeout = 300) {
    let timer: NodeJS.Timeout | undefined;
    return (() => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(func, timeout);
    })();
}
