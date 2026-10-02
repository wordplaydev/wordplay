/**
 * Which device voice speaks an utterance.
 *
 * Pure and separate from `speech.ts` because it is a decision with a bug in
 * its history: an utterance's `lang` does not override its `voice`. Engines
 * speak in the voice's own language, so pinning an English voice and then
 * setting `lang` to Japanese does not produce Japanese — it produces an
 * English voice reading Japanese characters, which is unintelligible. Any
 * voice choice therefore has to be checked against the language before it is
 * applied.
 */

/** A device voice, narrowed to what choosing needs. */
export type VoiceOption = {
    /** BCP-47, e.g. `en-GB`. */
    lang: string;
    /** Device-local identity: stable on one device, meaningless across them. */
    uri: string;
    name?: string;
    default?: boolean;
    /** Runs on the device rather than over the network. */
    local?: boolean;
};

/** Apple's novelty voices, no way to hear a lesson. Chromium on macOS flags
 *  Albert as its default; Safari flags an ordinary voice. */
const NoveltyVoices = [
    'Albert',
    'Bad News',
    'Bahh',
    'Bells',
    'Boing',
    'Bubbles',
    'Cellos',
    'Good News',
    'Jester',
    'Organ',
    'Superstar',
    'Trinoids',
    'Whisper',
    'Wobble',
    'Zarvox',
];

/** Chromium appends the language to the name. */
export function isNovelty(voice: VoiceOption): boolean {
    const name = voice.name ?? '';
    return NoveltyVoices.some(
        (novelty) => name === novelty || name.startsWith(`${novelty} (`),
    );
}

/** A voice to use instead of a novelty default; otherwise the engine picks. */
function insteadOfNovelty(
    available: readonly VoiceOption[],
    lang: string | undefined,
): VoiceOption | undefined {
    const wanted = primarySubtag(lang);
    const speaks = available.filter(
        (voice) => wanted === undefined || primarySubtag(voice.lang) === wanted,
    );
    const fallback = speaks.find((voice) => voice.default) ?? speaks[0];
    if (fallback === undefined || !isNovelty(fallback)) return undefined;
    const ordinary = speaks.filter((voice) => !isNovelty(voice));
    return (
        ordinary.find((voice) => /enhanced|premium/i.test(voice.name ?? '')) ??
        ordinary.find((voice) => voice.local) ??
        ordinary[0]
    );
}

/** The primary subtag of a language tag, lowercased: `en` from `en-GB`. */
export function primarySubtag(tag: string | undefined): string | undefined {
    if (tag === undefined) return undefined;
    const primary = tag.split(/[-_]/)[0]?.toLowerCase();
    return primary === undefined || primary.length === 0 ? undefined : primary;
}

/**
 * The voice to speak with, or undefined to let the engine pick from `lang`.
 * With nothing pinned, the engine picks unless its pick would be a novelty
 * voice; see `insteadOfNovelty`.
 *
 * The viewer's pinned voice wins whenever it can: it is an accessibility
 * choice — someone who cannot follow the default voice must be able to
 * replace it — and nothing a program does should be able to take it away.
 * "Whenever it can" is the whole subtlety: a voice that doesn't speak the
 * utterance's language would render it as gibberish, so there the pin is
 * dropped and the language decides instead. Region is not compared, since an
 * American voice reading British English is a preference, not a failure.
 */
export function chooseVoice(
    available: readonly VoiceOption[],
    /** The viewer's pinned voiceURI, from their settings. */
    uri: string | undefined,
    /** The utterance's language tag, if its text carried one. */
    lang: string | undefined,
): VoiceOption | undefined {
    const pinned =
        uri === undefined
            ? undefined
            : available.find((voice) => voice.uri === uri);

    const wanted = primarySubtag(lang);
    if (
        pinned !== undefined &&
        (wanted === undefined || wanted === primarySubtag(pinned.lang))
    )
        return pinned;
    return insteadOfNovelty(available, lang);
}
