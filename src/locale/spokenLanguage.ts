/**
 * Language marks for text that is read aloud (#111).
 *
 * A screen reader picks its voice from the `lang` of the element it reads, and
 * an announcement is usually a sentence in the reader's language with a
 * creator's words inside it ("new Phrase, hola"). Those words have to reach the
 * Announcer as their own run, tagged with their own language, or they are read
 * in the wrong voice. Templates and descriptions are all plain strings, so the
 * run boundary travels inside the string as private-use characters, which the
 * Announcer turns into `<span lang>` runs. Marked text must never be shown:
 * only strings bound for an announcement are marked.
 */

import type MarkupValue from '@values/MarkupValue';
import type TextValue from '@values/TextValue';

const Open = '';
const Separator = '';
const Close = '';

const MarkPattern = /([^]*)([^]*)/gu;

/** One stretch of an announcement, in one language. */
export type SpokenRun = {
    readonly text: string;
    readonly language: string | undefined;
};

/** Marks text as being in the given BCP 47 language; untagged text is left alone,
 *  since it is in whatever language surrounds it. */
export function markLanguage(text: string, language: string | undefined) {
    return language === undefined || text.length === 0
        ? text
        : `${Open}${language}${Separator}${text}${Close}`;
}

/** The text with every language mark removed, for anywhere it is displayed. */
export function withoutLanguageMarks(text: string): string {
    return text.includes(Open) ? text.replace(MarkPattern, '$2') : text;
}

/**
 * Splits a marked message into runs, with unmarked stretches in the base
 * language. Undefined when nothing is marked, or when every mark is in the base
 * language already, so an ordinary announcement stays a single text node.
 */
export function toSpokenRuns(
    message: string,
    base: string | undefined,
): SpokenRun[] | undefined {
    if (!message.includes(Open)) return undefined;
    const runs: SpokenRun[] = [];
    const push = (text: string, language: string | undefined) => {
        if (text.length === 0) return;
        const last = runs.at(-1);
        if (last !== undefined && last.language === language)
            runs[runs.length - 1] = { text: last.text + text, language };
        else runs.push({ text, language });
    };
    let index = 0;
    for (const match of message.matchAll(MarkPattern)) {
        push(message.slice(index, match.index), base);
        push(match[2] ?? '', match[1] || base);
        index = match.index + match[0].length;
    }
    push(message.slice(index), base);
    return runs.every((run) => run.language === base) ? undefined : runs;
}

/**
 * A text or markup value as it should be read aloud: its words, each marked with
 * the language it is in, so an announcement containing them switches voice
 * where the words do (#111). Only for strings bound for the Announcer; never
 * display the result.
 */
export function spokenText(value: TextValue | MarkupValue): string {
    const whole = value.language?.getBCP47();
    if (!('text' in value)) {
        const languages = value.markup.metadata?.segmentLanguages;
        if (languages === undefined)
            return markLanguage(value.markup.toText(), whole);
        return value.markup.paragraphs
            .map((paragraph) =>
                paragraph.segments
                    .map((segment) =>
                        markLanguage(
                            segment.toText(),
                            languages.get(segment)?.getBCP47() ?? whole,
                        ),
                    )
                    .join(''),
            )
            .join('\n\n');
    }
    if (value.parts === undefined) return markLanguage(value.text, whole);
    return value.parts
        .map((part) =>
            markLanguage(part.text, part.language?.getBCP47() ?? whole),
        )
        .join('');
}
