import type Locales from '@locale/Locales';

/**
 * What the announcer says as a conversation is replied to, reacted to, and tied
 * to code (#821, #820).
 *
 * Pure and separate from the view for the reason
 * {@link collaboratorAnnounce.ts} is: the queued lane drops a repeat of
 * identical text, so an announcement that reads the same two firings running is
 * heard once and then sounds broken. Every one of these names what actually
 * differs — the emoji and how many people have chosen it, whose thread it is
 * and how many replies it holds, which lines are being talked about — and the
 * test beside this file fires each of them twice over different state and
 * insists the two strings differ.
 */

/** Said when a thread opens. */
export function threadAnnouncement(
    locales: Locales,
    name: string,
    replies: number,
): string {
    return locales
        .concretize((l) => l.ui.collaborate.announce.thread, {
            name,
            count: replies,
        })
        .toText();
}

/** Said when a reaction is added or taken back. The count is what it becomes,
 *  not what it was, since that is the thing the reader is checking. */
export function reactionAnnouncement(
    locales: Locales,
    emoji: string,
    people: number,
    on: boolean,
): string {
    return locales
        .concretize(
            on
                ? (l) => l.ui.collaborate.announce.reacted
                : (l) => l.ui.collaborate.announce.unreacted,
            { emoji, count: people },
        )
        .toText();
}

/** Said when the message being written picks up some code. */
export function referenceAnnouncement(
    locales: Locales,
    location: string,
): string {
    return locales
        .concretize((l) => l.ui.collaborate.announce.attached, { location })
        .toText();
}

/** Said when a marker in the code takes the reader to what was said about it.
 *  Names who said it and how it starts: "went to the message" is the same words
 *  every time, and the queued lane drops a repeat, so it would be heard once
 *  and then sound broken. */
export function foundAnnouncement(
    locales: Locales,
    name: string,
    text: string,
): string {
    return locales
        .concretize((l) => l.ui.collaborate.announce.found, {
            name,
            // Enough to tell two messages apart without reading a whole one
            // back, since this is spoken every time a marker is pressed. Named
            // `opening` rather than `words`, which the locale tooling reads as
            // a count that has forgotten its plural forms.
            opening: firstWords(text),
        })
        .toText();
}

/** The opening of a message, for an announcement that has to distinguish it
 *  from the last one without reciting it. */
function firstWords(text: string): string {
    const words = text.trim().split(/\s+/).slice(0, 6).join(' ');
    return words.length < text.trim().length ? `${words}…` : words;
}
