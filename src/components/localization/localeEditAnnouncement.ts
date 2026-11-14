import type { LocaleEditResult } from '#db/locales/LocalizationDexie.ts';
import type Locales from '#locale/Locales.ts';

/** The first words of the text, enough to say which field an edit was in. */
function snippet(text: string) {
    const words = text.trim().replace(/\s+/g, ' ');
    return words.length > 60 ? `${words.slice(0, 60)}…` : words;
}

/**
 * What to announce about a localization edit. A save names the text it saved, so saving two
 * fields in a row is heard twice rather than deduplicated into silence; a failure is the same
 * words every time, which is why it goes on the lane that re-presents identical text.
 */
export function localeEditAnnouncement(
    locales: Locales,
    result: LocaleEditResult,
): { kind: 'locale-edit' | 'ignored'; message: string } {
    if (result.kind === 'failed')
        return {
            kind: 'ignored',
            message: locales.getPrimaryPlainText(
                (l) => l.ui.localize.save.failed,
            ),
        };
    return {
        kind: 'locale-edit',
        message: locales
            .concretize(
                result.kind === 'saved'
                    ? (l) => l.ui.localize.save.savedAnnouncement
                    : (l) => l.ui.localize.save.revertedAnnouncement,
                { text: snippet(result.text) },
            )
            .toText(),
    };
}
