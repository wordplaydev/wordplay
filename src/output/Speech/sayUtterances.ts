import type { Utterance } from '#output/Speech/speechQueue.ts';
import type TextValue from '#values/TextValue.ts';

/**
 * What a `Say` asks the speech bus to speak. A line in several languages is one
 * utterance per language, since an utterance has one voice (#111); the caption
 * shows the whole line throughout rather than flickering from part to part.
 * Untagged text is in `fallback`, the language the program chose its text in.
 */
export default function sayUtterances(
    source: string,
    text: TextValue,
    captioned: boolean,
    fallback: string | undefined,
): Utterance[] {
    const whole = text.language?.getBCP47() ?? fallback;
    const parts = text.parts ?? [{ text: text.text, language: undefined }];
    return parts.map((part) => ({
        source,
        text: part.text,
        lang: part.language?.getBCP47() ?? whole,
        rate: 1,
        volume: 1,
        priority: 'flow',
        captioned,
        caption: text.text,
    }));
}
