export function getCodepointFromString(text: string) {
    const conversion = String.fromCharCode(parseInt(text, 16));
    return conversion.length === 0 || conversion === '\x00'
        ? undefined
        : conversion;
}
