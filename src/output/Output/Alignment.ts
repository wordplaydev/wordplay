export const Alignments = ['<', '|', '>'] as const;

type Alignment = (typeof Alignments)[number];

/** Whether creator text names an alignment, narrowing it when it does. */
export function isAlignment(text: string): text is Alignment {
    return Alignments.some((alignment) => alignment === text);
}

export { type Alignment as default };
