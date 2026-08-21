import {
    hasUnclosedText,
    mismatchedDelimiter,
    splitMarkupAndCode,
} from '@util/verify-locales/protect';

/**
 * Whether a translation can be safely substituted for its source.
 *
 * A translator rewriting prose sometimes takes a delimiter with it — doubling a
 * backtick, dropping a trailing `\`, or writing a transliteration's glottal stop
 * as `'`, which is a text delimiter in Wordplay code and swallows everything
 * after it. Either way the surrounding program stops tokenizing the way it did,
 * and shipping that costs the creator their program rather than one string's
 * localization. The locale tooling makes exactly these checks before accepting a
 * localized example; this is the same guarantee for the in-app path.
 *
 * Returns the reason to reject, or undefined if the translation is safe.
 */
export function translationProblem(
    source: string,
    translation: string,
): 'delimiter' | 'unclosed' | undefined {
    // Example delimiters are structural: translation never legitimately adds or
    // drops one, so a count that differs means one was orphaned.
    if (mismatchedDelimiter(source, translation) !== undefined)
        return 'delimiter';
    // An apostrophe is a text delimiter only in *code*. In prose it is just an
    // apostrophe — `'` isn't a markup symbol, so it can't open a literal there —
    // and checking the whole string rejected every French, Italian, or
    // possessive-English sentence the model wrote with an ASCII `'`, silently
    // keeping the English. So look only inside embedded `\code\`, which is where
    // a translated identifier can really leave a literal open.
    if (unclosedInCode(source)) return undefined;
    return unclosedInCode(translation) ? 'unclosed' : undefined;
}

/** Whether any `\code\` segment of this markup ends inside an open text literal. */
function unclosedInCode(text: string): boolean {
    return splitMarkupAndCode(text).some(
        (segment) => segment.kind === 'code' && hasUnclosedText(segment.text),
    );
}
