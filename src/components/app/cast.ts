/**
 * The ensemble cast: the symbolic names of the language's input streams and
 * output types, conveying the abundance of things a program can sense and say.
 *
 * Shared, rather than copied, by the two places that draw it — the social share
 * card ({@link scripts/logo/manifest.ts}) and the landing page's stage ({@link
 * StageCast.svelte}) — the same way {@link logoMark.ts} is shared, so the page a
 * visitor lands on shows the crowd they saw in the link preview.
 *
 * Variation selectors are omitted: the card's rasterizer can't read them, and the
 * page renders in a monochrome emoji face where they'd only ask for the color one.
 * Moment and Now are value constructors rather than streams, so their calendar and
 * clock stay out.
 */
export const Cast = [
    // Input streams.
    '🎲',
    '🔘',
    '🖱',
    '👆',
    '⌨',
    '🕕',
    '🎤',
    '🎵',
    '🎙',
    '🎥',
    '🖐',
    '🙂',
    '📦',
    '🎬',
    '⚽',
    '🗣',
    '🖋',
    '🔗',
    // Output types.
    '🔳',
    '💬',
    '🔊',
    '🎼',
    '🎶',
    '🔈',
    '🤪',
    '🌈',
    '💃',
    '📍',
    '✋',
    '🔎',
    '😀',
    '💨',
    '⚛',
    '🔮',
    '🎭',
];
