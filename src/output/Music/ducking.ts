/**
 * When music gets out of the way. Two voices compete with it — the screen
 * reader's live region and `Say`'s speech synthesis — and both must win. The
 * ducking itself is not optional; only its depth is (`MusicDuckingSetting`).
 */

import { derived, writable, type Writable } from 'svelte/store';
import { announcerPresenting } from '@components/project/announcerQueue';

/**
 * True while `Say` is speaking. OutputView owns the utterance chain, so it
 * sets this from the same `onstart`/`onend`/cancel paths that drive its
 * speaking index.
 */
export const saySpeaking: Writable<boolean> = writable(false);

/** True while anything else is talking. */
export const shouldDuckMusic = derived(
    [announcerPresenting, saySpeaking],
    ([$announcing, $saying]) => $announcing || $saying,
);
