export default function segmentWraps(text: string): string[] {
    const counts: number[] = [];
    let count = 0;
    let spaces = false;
    for (let i = 0; i < text.length; i++) {
        const c = text.charAt(i);
        count++;
        if (c === ' ') spaces = true;
        else if (spaces) {
            counts.push(count - 1);
            spaces = false;
            count = 1;
        }
    }
    const segments: string[] = [];
    let remainder = text;
    for (const count of counts) {
        segments.push(remainder.substring(0, count));
        remainder = remainder.substring(count);
    }
    if (remainder.length > 0) segments.push(remainder);
    return segments;
}
