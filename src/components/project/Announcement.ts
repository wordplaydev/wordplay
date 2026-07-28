import type LanguageCode from '@locale/LanguageCode';
import type { AnnouncementKind } from './announcerQueue';

export default class Announcement {
    readonly kind: AnnouncementKind;
    readonly language: LanguageCode | undefined;
    readonly text: string;

    constructor(
        kind: AnnouncementKind,
        language: LanguageCode | undefined,
        text: string,
    ) {
        this.kind = kind;
        this.language = language;
        this.text = text;
    }
}
