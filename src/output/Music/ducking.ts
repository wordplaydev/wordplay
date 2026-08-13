/**
 * When music gets out of the way. Two voices compete with it — the screen
 * reader's live region and `Say`'s speech synthesis — and both must win. The
 * ducking itself is not optional; only its depth is (`MusicDuckingSetting`).
 */

import { derived, type Readable } from 'svelte/store';
import { announcerPresenting } from '@components/project/announcerQueue';
import { SaySource, speakingNow } from '@output/Speech/speech';

/**
 * True while a standalone `Say` is speaking.
 *
 * Deliberately scoped to `Say` and not to every speaker: a track's spoken text
 * shares the same synthesizer, but it is *part of* the mix it would be ducking,
 * so ducking on it would pump the gain on every word. Only a voice from
 * outside the music gets the music out of its way.
 */
export const saySpeaking: Readable<boolean> = derived(
    speakingNow,
    ($speaking) => $speaking?.source === SaySource,
);

/** True while anything else is talking. */
export const shouldDuckMusic = derived(
    [announcerPresenting, saySpeaking],
    ([$announcing, $saying]) => $announcing || $saying,
);
