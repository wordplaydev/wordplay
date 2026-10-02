import {
    toSpokenRuns,
    withoutLanguageMarks,
    type SpokenRun,
} from '#locale/spokenLanguage.ts';
import type { AnnouncementKind } from './announcerQueue';

export default class Announcement {
    readonly kind: AnnouncementKind;
    /** The BCP 47 language of the announcement as a whole. */
    readonly language: string | undefined;
    /** What is read, with language marks removed; pacing and dedupe use this. */
    readonly text: string;
    /** Stretches in other languages than `language`, when the message marked
     *  any (see spokenLanguage.ts); undefined for a single-language message. */
    readonly runs: SpokenRun[] | undefined;

    constructor(
        kind: AnnouncementKind,
        language: string | undefined,
        text: string,
    ) {
        this.kind = kind;
        this.language = language;
        this.text = withoutLanguageMarks(text);
        this.runs = toSpokenRuns(text, language);
    }
}
