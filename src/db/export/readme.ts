import type { AccountSnapshot, CollectionStep } from './AccountSnapshot';

/**
 * The plain-text explanation that sits at the top of an account archive (#152).
 *
 * Takes resolved strings rather than a `Locales`, which keeps this module pure
 * and its test a millisecond long. The component resolves the accessors, which
 * is also where the rule about *which* locale lives: an archive is one file, so
 * it is written in the creator's primary language rather than in every language
 * they have chosen, back to back.
 */

/** Every paragraph of the README, already resolved. */
export type ReadmeText = {
    title: string;
    /** What this is and when it was made. */
    intro: string;
    /** What each folder holds. */
    contents: string;
    /** What the .json and .wp files inside a folder are. */
    contentsFiles: string;
    /** What account.json and the self folder hold. */
    contentsAccount: string;
    /** What each relationship folder is named, and what it holds. */
    relationships: string;
    /** That one word can mean two things — `creator` means "may add projects"
     *  on a gallery and "wrote it" on a how-to — and what index.json is for. */
    relationshipsWords: string;
    /** That the `device` folder exists on this device and nowhere else. */
    device: string;
    /** How to read a `.wp` file back into Wordplay. */
    formats: string;
    /** What was deliberately left out, and why. */
    excluded: string;
    /** That chats and class rosters hold other people's words and names, and
     *  that nothing here is encrypted. */
    privacy: string;
    /** Introduces the list of what could not be read. Only ever shown when
     *  there is something to list. */
    missing: string;
    /** Points at the machine-readable half, so no reader has to parse prose. */
    manifest: string;
    /** What each collection is called, for the missing list. */
    kinds: Record<CollectionStep, string>;
};

/**
 * The README's text.
 *
 * The missing-things paragraph appears only when something is actually
 * missing: a heading with nothing under it reads like a failure, and an
 * archive with nothing wrong with it should say nothing about gaps at all.
 */
export function buildReadme(
    text: ReadmeText,
    snapshot: AccountSnapshot,
): string {
    const paragraphs = [
        text.title,
        text.intro,
        text.contents,
        text.contentsFiles,
        text.contentsAccount,
        text.relationships,
        text.relationshipsWords,
        text.device,
        text.formats,
        text.excluded,
        text.privacy,
    ];

    if (snapshot.gaps.length > 0)
        paragraphs.push(
            [
                text.missing,
                ...snapshot.gaps.map(
                    (gap) => `- ${text.kinds[gap.collection]}: ${gap.reason}`,
                ),
            ].join('\n'),
        );

    paragraphs.push(text.manifest);

    // A trailing newline, because a text file without one is a text file some
    // tools will complain about.
    return `${paragraphs.join('\n\n')}\n`;
}
