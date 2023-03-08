export default function range(from: number, to: number) {
    return Array.from(
        { length: Math.abs(to - from) + 1 },
        (e, i) => i + Math.min(from, to)
    );
}
