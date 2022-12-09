export default function toCSS(values: Record<string,string|undefined>) {
    return Object.keys(values).map(key => {
        const val = values[key];
        return val === undefined ? "" : `${key}: ${values[key]};`;
    }).join(" ");
}