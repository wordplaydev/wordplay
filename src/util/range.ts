export default function range(from: number, to: number) {
    return Array.from({ length: to - from + 1 }, (e, i) => i + from);
}
