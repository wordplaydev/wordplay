/** A programming language a learner may already know, used to contrast with Wordplay in the quick
 * tutorial via ExternalExample markup. `tag` is the short id written in markup (`\py| …\`); `hljs`
 * is the highlight.js grammar id, or null for languages with no text grammar (rendered plain). */
export type ContrastLanguage = {
    tag: string;
    label: string;
    hljs: string | null;
};

export const ContrastLanguages: ContrastLanguage[] = [
    { tag: 'py', label: 'Python', hljs: 'python' },
    { tag: 'js', label: 'JavaScript', hljs: 'javascript' },
    { tag: 'jv', label: 'Java', hljs: 'java' },
];

export const DEFAULT_CONTRAST_LANGUAGE = 'py';

export function getContrastLanguage(tag: string): ContrastLanguage | undefined {
    return ContrastLanguages.find((language) => language.tag === tag);
}

export function parseContrastLanguage(value: unknown): string | undefined {
    return typeof value === 'string' && getContrastLanguage(value) !== undefined
        ? value
        : undefined;
}
