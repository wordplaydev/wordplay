/**
 * The voice-stealing policy. Tracks are nearly free; sounding voices are
 * not, and `tracks` is a list, so a runaway is one expression away. On
 * reaching the cap the player steals a voice rather than letting the audio
 * thread miss its deadline: stealing degrades gracefully, a dropout does not.
 */

export type Voice = {
    id: number;
    /** The music's reconciliation name. */
    music: string;
    /** Audio-clock seconds when the voice started. */
    startTime: number;
    velocity: number;
    /** True once past its note's end, ringing in its release. */
    released: boolean;
};

export const VoiceCap = 32;

/**
 * Which voice to steal to make room for one more, or undefined if under the
 * cap: released voices first (already fading), then the quietest, oldest as
 * the tiebreak.
 */
export function chooseSteal(
    active: readonly Voice[],
    cap: number = VoiceCap,
): Voice | undefined {
    if (active.length < cap) return undefined;
    const released = active.filter((voice) => voice.released);
    const pool = released.length > 0 ? released : active;
    let victim: Voice | undefined = undefined;
    for (const voice of pool) {
        if (
            victim === undefined ||
            voice.velocity < victim.velocity ||
            (voice.velocity === victim.velocity &&
                voice.startTime < victim.startTime)
        )
            victim = voice;
    }
    return victim;
}
